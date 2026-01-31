import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Copy, Trash2, Edit2, Layers, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DiagramProject } from "@/types/diagram";

interface InstrumentCardProps {
  project: DiagramProject;
  isExportMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onEdit: (projectId: string) => void;
  onEditDetails: (projectId: string) => void;
  onDuplicate: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

export function InstrumentCard({
  project,
  isExportMode = false,
  isSelected = false,
  onToggleSelect,
  onEdit,
  onEditDetails,
  onDuplicate,
  onDelete,
}: InstrumentCardProps) {
  const topicCount = project.topics.length;
  const updatedAgo = formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true });

  const handleCardClick = () => {
    if (isExportMode) {
      onToggleSelect?.();
    } else {
      onEdit(project.id);
    }
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all",
        isExportMode && isSelected && "ring-2 ring-primary bg-primary/5",
        !isExportMode && "hover:shadow-lg hover:border-primary/50",
      )}
      onClick={handleCardClick}
      data-tour={!isExportMode ? "gallery-project-card" : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {isExportMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.()}
              onClick={(e) => e.stopPropagation()}
              className="mr-3 mt-1"
            />
          )}
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{project.instrument.type}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {project.instrument.revision}
              </Badge>
              {project.instrument.label && (
                <span className="text-sm text-muted-foreground truncate">{project.instrument.label}</span>
              )}
            </div>
          </div>
          {!isExportMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(project.id);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Open Editor
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditDetails(project.id);
                  }}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(project.id);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {project.instrument.description && (
          <CardDescription className="line-clamp-2 mb-4">{project.instrument.description}</CardDescription>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            <span>
              {topicCount} topic{topicCount !== 1 ? "s" : ""}
            </span>
          </div>
          <span>Modified {updatedAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}
