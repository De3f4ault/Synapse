import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FileValidationResult } from "../engine/validation";

interface FileValidatorProps {
    validationResult: FileValidationResult;
    filename: string;
}

/**
 * Display file validation status
 */
export const FileValidator: React.FC<FileValidatorProps> = ({
    validationResult,
    filename,
}) => {
    if (validationResult.valid) {
        return (
            <Alert className="border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <AlertDescription className="text-emerald-300">
                    <span className="font-mono">{filename}</span> is valid and ready to
                    upload
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert className="border-red-500/30 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
                <span className="font-mono">{filename}</span>: {validationResult.error}
            </AlertDescription>
        </Alert>
    );
};
