from typing import Dict, Any

# Security limits for container execution optimized for 10k concurrent users
MAX_MEMORY_MB = 64
MAX_CPU_QUOTA = 25000  # 0.25 CPU out of 100000
MAX_PIDS = 64
MAX_EXECUTION_TIME = 5  # seconds
MAX_OUTPUT_SIZE = 1 * 1024 * 1024  # 1 MB


def get_secure_container_config(
    image: str,
    command: str,
    working_dir: str,
    binds: Dict[str, Dict[str, str]],
    mem_limit: str = None,
) -> Dict[str, Any]:
    """
    Returns a dictionary of secure configuration parameters for `docker.containers.run`.
    """
    return {
        "image": image,
        "command": command,
        "working_dir": working_dir,
        "volumes": binds,
        "detach": True,
        # Security: Disable networking to prevent downloading malicious payloads or DDoS
        "network_disabled": True,
        # Security: Read-only root filesystem to prevent tampering
        "read_only": True,
        # Mount /tmp in memory to allow compilers to work without writing to disk
        "tmpfs": {"/tmp": "size=32m,exec,mode=1777"},
        # Resource constraints
        "mem_limit": mem_limit or f"{MAX_MEMORY_MB}m",
        "cpu_period": 100000,
        "cpu_quota": MAX_CPU_QUOTA,
        "pids_limit": MAX_PIDS,
        # Security: Run as non-root user (guest) and drop root capabilities
        # We assume standard slim images have a generic user, but to be extremely safe,
        # we can pass user='nobody', but that sometimes breaks compilation in /tmp.
        # So we mount /tmp/execution as rw, but rest is isolated.
        "user": "nobody",
        "cap_drop": ["ALL"],
        "security_opt": ["no-new-privileges"],
        # Logging config to prevent log spam taking down host disk
        "log_config": {
            "type": "json-file",
            "config": {"max-size": "1m", "max-file": "1"},
        },
    }
