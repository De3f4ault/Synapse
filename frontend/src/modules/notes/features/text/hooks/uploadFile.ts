
// Simulated file upload handler
// In a real app, this would POST to /api/upload and return a URL
export async function uploadFile(file: File): Promise<string> {
  console.log("Mock uploading file:", file.name);
  
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create a local object URL for preview
  // In production, this MUST be a persistent public URL
  return URL.createObjectURL(file);
}
