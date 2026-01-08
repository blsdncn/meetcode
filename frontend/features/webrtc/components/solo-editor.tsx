"use client"

import { useState, useRef } from "react"
import dynamic from "next/dynamic"

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading editor...</div>,
})

interface SoloEditorProps {
  matchId: string
  onCodeChange?: (code: string) => void
}

const BOT_MESSAGES = [
  "# 🤖 You matched with MeetCodeBot!\n# I have no functionality, so you're on your own!\n# Good luck and happy coding! 🚀\n\n",
  "# 🤖 MeetCodeBot here!\n# I'm just a placeholder bot with zero brain cells.\n# But hey, at least there's no awkward small talk!\n# You got this! 💪\n\n",
  "# 🤖 Beep boop! MeetCodeBot activated!\n# Plot twist: I can't actually help you code.\n# Think of me as moral support... that can't talk.\n# May the algorithms be ever in your favor! ✨\n\n",
]

export default function SoloEditor({ matchId, onCodeChange }: SoloEditorProps) {
  const [botMessage] = useState(() => BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)])
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor

    editor.onDidChangeModelContent(() => {
      const code = editor.getValue()
      onCodeChange?.(code)
    })
  }

  return (
    <div className="h-full border border-border rounded-lg overflow-hidden">
      <div className="p-2 border-b bg-muted flex items-center justify-between">
        <h3 className="text-sm font-medium">Code Editor</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            Solo Mode
          </span>
          <span className="text-xs text-muted-foreground">
            Room: {matchId.slice(0, 8)}...
          </span>
        </div>
      </div>
      <div className="h-[calc(100%-3rem)]">
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          defaultValue={botMessage}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            lineNumbers: "on",
            renderLineHighlight: "all",
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: "line",
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  )
}
