import { NextResponse } from "next/server";
import JSZip from "jszip";

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }

  try {
    const { filesToKeep } = await req.json();
    console.log("Files to keep for download:", filesToKeep);

    const zip = new JSZip();
    
    // Add a dummy file to the zip archive to make it a valid zip.
    // In a real application, you would fetch the actual files based on `filesToKeep`
    // from your storage (e.g., Supabase Storage, S3) and add them to the zip.
    const dummyContent = `This is your cleaned folder from DupeDelete.\n\nFiles that would have been kept:\n- ${filesToKeep.join("\n- ")}\n\nIn a real application, this would contain your actual cleaned files.`;
    zip.file("cleaned_files_summary.txt", dummyContent);

    const zipBlob = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipBlob, {
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