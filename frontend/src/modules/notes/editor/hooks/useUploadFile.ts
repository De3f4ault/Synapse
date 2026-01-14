import { useMutation } from "@tanstack/react-query";
import { ChatService } from "../../../../api/generated";

/**
 * Hook to upload files using the ChatService (which provides a generic file upload endpoint).
 * Returns the URL of the uploaded file.
 */
export const useUploadFile = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const response = await ChatService.uploadChatFileApiV1ChatFilesUploadPost(
        { file },
      );
      return response.url;
    },
  });
};
