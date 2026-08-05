import docker
from docker.errors import DockerException, ImageNotFound
import asyncio
import logging
import threading
import time
from typing import Dict, Optional, Any

logger = logging.getLogger(__name__)

# Basic pool configuration
WARM_POOL_SIZE = 1 # Keep 1 warm container per language for now

class ContainerPoolManager:
    _instance = None

    def __init__(self):
        self.client = docker.from_env()
        # language -> queue of warm containers
        self.pools: Dict[str, asyncio.Queue] = {}
        # Protect against race conditions during initialization
        self._lock = threading.Lock()
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def initialize_pool(self, language: str, image: str, mem_limit: str = "256m"):
        """Ensures the pool queue exists for a language."""
        if language not in self.pools:
            self.pools[language] = asyncio.Queue()
            # Start background task to keep pool populated
            asyncio.create_task(self._maintain_pool(language, image, mem_limit))
            
    async def _maintain_pool(self, language: str, image: str, mem_limit: str):
        """Background task to ensure we always have WARM_POOL_SIZE containers."""
        queue = self.pools[language]
        while True:
            current_size = queue.qsize()
            if current_size < WARM_POOL_SIZE:
                try:
                    container = await asyncio.to_thread(self._create_warm_container, image, mem_limit)
                    if container:
                        await queue.put(container)
                        logger.info(f"Added warm container for {language} to pool. Pool size: {queue.qsize()}")
                except Exception as e:
                    logger.error(f"Failed to create warm container for {language}: {e}")
                    await asyncio.sleep(5) # Wait before retry
            else:
                await asyncio.sleep(1) # Check periodically

    def _create_warm_container(self, image: str, mem_limit: str):
        """Creates a long-running idle container."""
        try:
            self.client.images.get(image)
        except ImageNotFound:
            logger.info(f"Pulling Docker image {image}...")
            self.client.images.pull(image)

        try:
            # Create a container running 'sleep infinity'
            container = self.client.containers.run(
                image=image,
                command="sleep infinity",
                detach=True,
                tty=True,
                mem_limit=mem_limit,
                network_mode="none", # Secure execution
                cpu_quota=50000, # 50% of CPU
                cpu_period=100000
            )
            return container
        except Exception as e:
            logger.error(f"Error creating warm container: {e}")
            return None

    async def get_container(self, language: str) -> Optional[Any]:
        """Gets a warm container from the pool, blocking if none available."""
        if language not in self.pools:
            logger.error(f"Pool not initialized for language {language}")
            return None
            
        try:
            # Wait up to 5 seconds for a warm container
            container = await asyncio.wait_for(self.pools[language].get(), timeout=5.0)
            return container
        except asyncio.TimeoutError:
            logger.error(f"Timeout waiting for warm container for {language}")
            return None

    async def return_container(self, language: str, container, cleanup_dir: str = None):
        """Returns a container to the pool after cleaning up."""
        if cleanup_dir:
            try:
                # Async cleanup
                await asyncio.to_thread(self._cleanup_container, container, cleanup_dir)
            except Exception as e:
                logger.error(f"Failed to cleanup container: {e}")
                # If cleanup fails, we destroy it instead of returning to pool
                await asyncio.to_thread(self.destroy_container, container)
                return
                
        # Put back in queue if it's still alive
        try:
            container.reload()
            if container.status == "running":
                await self.pools[language].put(container)
            else:
                logger.warning(f"Container {container.id} is dead. Destroying.")
                await asyncio.to_thread(self.destroy_container, container)
        except Exception:
            pass

    def _cleanup_container(self, container, cleanup_dir: str):
        """Removes the temporary execution directory from the container."""
        try:
            exit_code, output = container.exec_run(f"rm -rf {cleanup_dir}")
            if exit_code != 0:
                raise RuntimeError(f"Cleanup failed: {output}")
        except Exception as e:
            raise e

    def destroy_container(self, container):
        try:
            container.remove(force=True)
        except Exception:
            pass
