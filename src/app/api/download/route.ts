import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }

  try {
    const { filesToKeep } = await req.json();
    console.log("Files to keep for download:", filesToKeep);

    // Simulate creating a zip file. In a real application, you would:
    // 1. Receive identifiers for the files to keep.
    // 2. Access these files from your storage (e.g., Supabase Storage, S3).
    // 3. Create a zip archive containing only the selected files.
    // 4. Stream the zip file back to the client.
    
    // For this mock, we'll return a simple text file with a .zip extension.
    const dummyZipContent = `This is a dummy zip file content from DupeDelete.\nFiles that would be kept: ${filesToKeep.join(", ")}\n\nIn a real scenario, this would be a proper zip archive of your cleaned files.`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dummyZipContent);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="cleaned-folder.zip"`,
      },
    });
  } catch (error) {
    console.error("Error in /api/download:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}