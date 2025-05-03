import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    // Use AI SDK to generate a summary
    const { text: summary } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Summarize the following video transcript in a concise paragraph:
      
${text}

Summary:`,
      maxTokens: 250,
    })

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Summarization error:", error)
    return NextResponse.json({ error: "Failed to summarize content" }, { status: 500 })
  }
}
