"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

// Dynamic import of Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading editor...</div>,
})

interface CollaborativeEditorProps {
  matchId: string
  dataChannel: RTCDataChannel | null
  onCodeChange?: (code: string) => void
}

// Custom Yjs sync provider using WebRTC data channel
class DataChannelProvider {
  private doc: any = null
  private yText: any = null
  private binding: any = null
  private awareness: any = null
  private Y: any = null

  constructor(
    private dataChannel: RTCDataChannel,
    private onReady: () => void,
    private onError: (error: any) => void
  ) {
    this.setupDataChannel()
    this.initializeYjs()
  }

  private async initializeYjs() {
    try {
      // Dynamic import to avoid SSR
      this.Y = await import("yjs")
      const { Awareness } = await import("y-protocols/awareness")
      
      this.doc = new this.Y.Doc()
      this.yText = this.doc.getText("monaco")
      this.awareness = new Awareness(this.doc)
      
      // Listen for document updates
      this.doc.on("update", (update: Uint8Array) => {
        if (this.dataChannel.readyState === "open") {
          try {
            // Try different approaches to send the data
            if (update.buffer instanceof ArrayBuffer) {
              this.dataChannel.send(update.buffer)
            } else {
              // Create a new ArrayBuffer from the Uint8Array
              const buffer = new ArrayBuffer(update.length)
              const view = new Uint8Array(buffer)
              view.set(update)
              this.dataChannel.send(buffer)
            }
          } catch (error) {
            console.error("Error sending Yjs update:", error)
          }
        }
      })

      this.onReady()
    } catch (error) {
      console.error("Failed to initialize Yjs:", error)
      this.onError(error)
    }
  }

  private setupDataChannel() {
    this.dataChannel.onmessage = async (event) => {
      try {
        // Receive updates from remote peer
        let update: Uint8Array
        
        if (event.data instanceof ArrayBuffer) {
          update = new Uint8Array(event.data)
        } else if (event.data instanceof Uint8Array) {
          update = event.data
        } else {
          return
        }
        
        if (this.doc && this.Y) {
          this.Y.applyUpdate(this.doc, update)
        }
      } catch (error) {
        console.error("Error applying Yjs update:", error)
      }
    }
  }

  async bindToMonaco(editor: any) {
    if (!this.doc || !this.yText || !editor) {
      return
    }

    try {
      const { MonacoBinding } = await import("y-monaco")
      
      this.binding = new MonacoBinding(
        this.yText,
        editor.getModel()!,
        new Set([editor]),
        this.awareness
      )
    } catch (error) {
      console.error("Failed to bind Monaco:", error)
      this.onError(error)
    }
  }

  destroy() {
    if (this.binding) {
      this.binding.destroy()
    }
    if (this.doc) {
      this.doc.destroy()
    }
  }
}

export default function CollaborativeEditor({
  matchId,
  dataChannel,
  onCodeChange,
}: CollaborativeEditorProps) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<any>(null)
  const providerRef = useRef<DataChannelProvider | null>(null)

  // Initialize Yjs provider when data channel is ready
  useEffect(() => {
    if (!dataChannel) {
      setIsReady(false)
      setError("No data channel")
      return
    }

    const handleOpen = () => {
      initializeProvider()
    }
    
    const handleClose = () => {
      setIsReady(false)
      setError("Data channel closed")
    }
    
    const handleError = () => {
      setIsReady(false)
      setError("Data channel error")
    }

    // Add event listeners
    dataChannel.addEventListener("open", handleOpen)
    dataChannel.addEventListener("close", handleClose)
    dataChannel.addEventListener("error", handleError)

    if (dataChannel.readyState === "open") {
      initializeProvider()
    } else {
      setIsReady(false)
      setError(`Data channel state: ${dataChannel.readyState}`)
    }

    function initializeProvider() {
      if (!dataChannel) return
      
      // Clean up existing provider
      if (providerRef.current) {
        providerRef.current.destroy()
      }
      
      const provider = new DataChannelProvider(
        dataChannel,
        () => {
          setIsReady(true)
          setError(null)
          
          // Bind to Monaco if editor is already mounted
          if (editorRef.current) {
            provider.bindToMonaco(editorRef.current)
          }
        },
        (error) => {
          setError(`Yjs error: ${error.message || error}`)
          setIsReady(false)
        }
      )

      providerRef.current = provider
    }

    return () => {
      if (dataChannel) {
        dataChannel.removeEventListener("open", handleOpen)
        dataChannel.removeEventListener("close", handleClose)
        dataChannel.removeEventListener("error", handleError)
      }
      
      if (providerRef.current) {
        providerRef.current.destroy()
        providerRef.current = null
      }
    }
  }, [dataChannel])

  // Handle Monaco editor mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor

    // Bind to Yjs if provider is ready
    if (providerRef.current && isReady) {
      providerRef.current.bindToMonaco(editor)
    }

    // Listen for content changes
    editor.onDidChangeModelContent(() => {
      const code = editor.getValue()
      onCodeChange?.(code)
    })
  }

  const getStatusColor = () => {
    if (error) return "bg-red-100 text-red-700"
    if (dataChannel?.readyState === "open" && isReady) return "bg-green-100 text-green-700"
    return "bg-yellow-100 text-yellow-700"
  }

  const getStatusText = () => {
    if (error) return "Error"
    if (!dataChannel) return "No Connection"
    if (dataChannel.readyState !== "open") return "Connecting..."
    if (!isReady) return "Initializing..."
    return "Sync Ready"
  }

  return (
    <div className="h-full border border-border rounded-lg overflow-hidden">
      <div className="p-2 border-b bg-muted flex items-center justify-between">
        <h3 className="text-sm font-medium">Collaborative Code Editor</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <span className="text-xs text-muted-foreground">
            Room: {matchId.slice(0, 8)}...
          </span>
        </div>
      </div>
      <div className="h-[calc(100%-3rem)]">
        {error ? (
          <div className="flex items-center justify-center h-full text-red-600">
            <div className="text-center">
              <p className="font-medium">Collaborative editing unavailable</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            defaultValue="// Start coding together!\nfunction solution() {\n  // Your code here\n}\n"
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
        )}
      </div>
    </div>
  )
}
