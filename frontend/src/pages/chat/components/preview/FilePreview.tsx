/**
 * FilePreview - Shows uploaded file
 * Routes to ImagePreview or DocumentPreview based on file type
 */

import React from 'react';
import { ImagePreview } from './ImagePreview';
import { DocumentPreview } from './DocumentPreview';

interface FilePreviewProps {
  file: File;
  index: number;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, index }) => {
  const isImage = file.type.startsWith('image/');

  if (isImage) {
    return <ImagePreview file={file} index={index} />;
  }

  return <DocumentPreview file={file} index={index} />;
};

export default FilePreview;
