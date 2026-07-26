import { MoreVertical, Star } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader } from "./Card"
import { Badge } from "./Badge"
import { Button } from "./Button"
import { cn } from "../../lib/utils"
import { Dropdown, DropdownItem, DropdownSeparator } from "./Dropdown"
import { useState } from "react"
import { useProjectsStore } from "../../stores/useProjectsStore"
import { useConfirm } from "../../components/ui/ConfirmProvider"
import { Modal } from "./Modal"
import { Input } from "./Input"

interface ProjectCardProps {
  id: string;
  name: string;
  language: string | null;
  updated_at: string;
  favorite?: boolean;
  color?: string | null;
  icon?: string | null;
  onFavorite?: (id: string) => void;
  onOpen?: (id: string) => void;
  className?: string;
}

export function ProjectCard({ 
  id,
  name, 
  language, 
  updated_at, 
  favorite = false,
  _color,
  icon,
  onFavorite,
  onOpen,
  className 
}: ProjectCardProps) {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const [isRenaming, setIsRenaming] = useState(false);
  const date = new Date(updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue === name) {
      setIsRenameModalOpen(false);
      return;
    }
    setIsRenaming(true);
    await useProjectsStore.getState().updateProject(id, { name: renameValue });
    setIsRenaming(false);
    setIsRenameModalOpen(false);
  };

  return (
    <Card 
      className={cn("group hover:border-primary/50 transition-colors flex flex-col cursor-pointer", className)}
      onClick={() => onOpen?.(id)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {icon && <span>{icon}</span>}
            <h3 className="font-semibold leading-none tracking-tight truncate flex-1">{name}</h3>
          </div>
          <p className="text-xs text-muted-foreground">Edited {date}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.(id);
            }}
          >
            <Star className={cn("h-4 w-4", favorite && "fill-yellow-500 text-yellow-500")} />
            <span className="sr-only">Toggle favorite</span>
          </Button>
          <Dropdown
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            }
          >
            <DropdownItem onClick={(e) => {
              e?.stopPropagation();
              onOpen?.(id);
            }}>
              Open Overview
            </DropdownItem>
            <DropdownItem onClick={(e) => {
              e?.stopPropagation();
              navigate(`/app/projects/${id}/editor`);
            }}>
              Open in Editor
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={(e) => {
              e?.stopPropagation();
              setRenameValue(name);
              setIsRenameModalOpen(true);
            }}>
              Rename
            </DropdownItem>
            <DropdownItem onClick={(e) => {
              e?.stopPropagation();
              useProjectsStore.getState().duplicateProject(id);
            }}>
              Duplicate
            </DropdownItem>
            <DropdownItem onClick={(e) => { e?.stopPropagation(); }}>
              Share
            </DropdownItem>
            <DropdownItem onClick={(e) => { e?.stopPropagation(); }}>
              Move
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={(e) => { e?.stopPropagation(); }}>
              Archive
            </DropdownItem>
            <DropdownItem onClick={(e) => { e?.stopPropagation(); }}>
              Download / Export ZIP
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem 
              onClick={async (e) => {
                e?.stopPropagation();
                const confirmed = await confirm({
                  title: "Move to Trash",
                  description: `Are you sure you want to delete "${name}"?`,
                  confirmText: "Move to Trash",
                  variant: "destructive"
                });
                if (confirmed) {
                  useProjectsStore.getState().deleteProject(id);
                }
              }}
              className="text-red-500 focus:text-red-500 focus:bg-red-50"
            >
              Move to Trash
            </DropdownItem>
          </Dropdown>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-4 mt-auto flex items-center justify-between">
        {language ? (
          <Badge variant="secondary" className="font-mono text-[10px] rounded-sm uppercase px-1.5 py-0">
            {language}
          </Badge>
        ) : (
          <div />
        )}
        <Button 
          variant="secondary" 
          size="sm" 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onOpen?.(id)}
        >
          Open Editor
        </Button>
      </CardContent>

      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title="Rename Project"
        description="Enter a new name for your project."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRename}
              disabled={isRenaming || !renameValue.trim() || renameValue === name}
            >
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </>
        }
      >
        <div className="py-4">
          <Input 
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Project name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              }
            }}
          />
        </div>
      </Modal>
    </Card>
  )
}
