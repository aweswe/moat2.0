import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitBranch, GitCommit } from "lucide-react";
import { useBranching } from "./BranchingProvider";

interface BranchPickerProps {
    traceId: string;
}

export function BranchPicker({ traceId }: BranchPickerProps) {
    const { branches, activeBranchId, switchBranch, refreshBranches } = useBranching();

    // Group branches by parent to show hierarchy (simple lvl 1 for now)
    const rootBranches = branches.filter(b => b.parentTraceId === traceId);

    // Find current branch object
    const currentBranch = branches.find(b => b.id === activeBranchId);

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 border-dashed">
                        <GitBranch className="h-4 w-4" />
                        {currentBranch ? (
                            <span className="font-mono">{currentBranch.id.slice(0, 8)}...</span>
                        ) : (
                            <span className="text-muted-foreground">Main Trace</span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[300px]">
                    <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => switchBranch(null as any)}>
                        <GitCommit className="mr-2 h-4 w-4" />
                        <span>Main Trace</span>
                        {!activeBranchId && <Badge variant="secondary" className="ml-auto">Active</Badge>}
                    </DropdownMenuItem>

                    {rootBranches.length > 0 && <DropdownMenuSeparator />}

                    {rootBranches.map(branch => (
                        <DropdownMenuItem key={branch.id} onClick={() => switchBranch(branch.id)}>
                            <GitBranch className="mr-2 h-4 w-4 text-orange-500" />
                            <div className="flex flex-col">
                                <span className="font-mono text-xs">{branch.id.slice(0, 8)}</span>
                                <span className="text-[10px] text-muted-foreground">
                                    Forked at step {branch.forkStep}
                                </span>
                            </div>
                            {activeBranchId === branch.id && (
                                <Badge variant="secondary" className="ml-auto">Active</Badge>
                            )}
                        </DropdownMenuItem>
                    ))}

                    {rootBranches.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            No branches yet. Fork a step to create one.
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
