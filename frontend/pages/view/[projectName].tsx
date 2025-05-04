import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Link from 'next/link'
import Head from 'next/head'

// Import markdown components
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

// For Syntax Highlighting
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import jsx from 'react-syntax-highlighter/dist/cjs/languages/prism/jsx'
import javascript from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript'
import typescript from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript'
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python'
import java from 'react-syntax-highlighter/dist/cjs/languages/prism/java'
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash'

// Register languages for syntax highlighting
SyntaxHighlighter.registerLanguage('jsx', jsx)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('js', javascript)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('ts', typescript)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('py', python)
SyntaxHighlighter.registerLanguage('java', java)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('sh', bash)

interface TutorialContent {
  project_name: string
  files: Record<string, string>
}

export default function TutorialViewerPage() {
  const router = useRouter()
  const { projectName } = router.query
  const [content, setContent] = useState<TutorialContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFile, setActiveFile] = useState<string>('index.md')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const mermaidContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchTutorial = async () => {
      if (!projectName) return

      try {
        const response = await axios.get(`/api/output/${projectName}`)
        setContent(response.data)
        
        // Set default active file to index.md
        if (response.data.files && response.data.files['index.md']) {
          setActiveFile('index.md')
        } else if (response.data.files && Object.keys(response.data.files).length > 0) {
          setActiveFile(Object.keys(response.data.files)[0])
        }
        
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch tutorial')
        setLoading(false)
      }
    }

    fetchTutorial()
  }, [projectName])

  // Process Markdown links to work with our app routing
  const processMarkdownLinks = (markdown: string) => {
    // Replace markdown links that point to .md files with links to our app's routes
    return markdown.replace(/\[([^\]]+)\]\(([^)]+)\.md\)/g, (match, text, file) => {
      // Extract filename without path if it has one
      const filename = file.split('/').pop()
      return `[${text}](/view/${projectName}?file=${filename}.md)`
    })
  }

  // Update URL when file changes
  useEffect(() => {
    if (!projectName || !activeFile) return

    // Check if file param exists in URL
    const fileParam = router.query.file
    if (fileParam !== activeFile) {
      router.push({
        pathname: `/view/${projectName}`,
        query: { file: activeFile }
      }, undefined, { shallow: true })
    }
  }, [activeFile, projectName, router])

  // Update active file when URL changes
  useEffect(() => {
    const fileParam = router.query.file as string
    if (fileParam && content?.files?.[fileParam]) {
      setActiveFile(fileParam)
    }
  }, [router.query.file, content])

  // Handle Mermaid diagrams rendering
  useEffect(() => {
    const initMermaid = async () => {
      if (!loading && content && mermaidContainerRef.current) {
        try {
          const mermaid = (await import('mermaid')).default
          mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
          })
          
          // Find all mermaid diagrams and render them
          const diagrams = mermaidContainerRef.current.querySelectorAll('.mermaid')
          if (diagrams.length > 0) {
            mermaid.run()
          }
        } catch (err) {
          console.error('Error initializing mermaid:', err)
        }
      }
    }
    
    // Allow some time for the DOM to update with the markdown content
    const timeoutId = setTimeout(() => {
      initMermaid()
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [loading, content, activeFile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-wf-red mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading tutorial...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-wf-red mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link href="/" className="inline-block bg-wf-red hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-md transition duration-200">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-wf-red mb-4">Tutorial Not Found</h1>
          <p className="text-gray-700 mb-6">The requested tutorial could not be found.</p>
          <Link href="/" className="inline-block bg-wf-red hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-md transition duration-200">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // Get sorted file list for sidebar
  const sortedFiles = Object.keys(content.files).sort((a, b) => {
    // Always put index.md first
    if (a === 'index.md') return -1
    if (b === 'index.md') return 1
    
    // Sort numerically if filenames start with numbers (e.g., 01_filename.md)
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999')
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999')
    
    return numA - numB
  })

  // Find the index of the current file and calculate next/previous files
  const currentIndex = sortedFiles.indexOf(activeFile)
  const prevFile = currentIndex > 0 ? sortedFiles[currentIndex - 1] : null
  const nextFile = currentIndex < sortedFiles.length - 1 ? sortedFiles[currentIndex + 1] : null

  // Format file names for display
  const formatFileName = (filename: string) => {
    if (filename === 'index.md') return 'Introduction'
    return filename
      .replace(/^\d+_/, '')
      .replace('.md', '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Head>
        <title>{content.project_name} - Tutorial</title>
        <meta name="description" content={`Tutorial for ${content.project_name}`} />
      </Head>

      {/* Header */}
      <header className="bg-wf-red text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded hover:bg-wf-red focus:outline-none focus:ring-2 focus:ring-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold tracking-tight">{content.project_name}</h1>
          </div>
          <Link href="/" className="hover:underline text-white font-medium">
            Home
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                          transform transition-transform duration-300 ease-in-out
                          md:translate-x-0 fixed md:relative z-10 md:z-0
                          w-64 h-[calc(100vh-60px)] bg-white border-r border-gray-200 overflow-y-auto
                          md:block`}>
          <div className="p-4">
            <h2 className="text-lg font-bold text-wf-red border-b border-wf-gray pb-2 mb-4">Contents</h2>
            <nav className="space-y-1">
              {sortedFiles.map((filename) => (
                <button
                  key={filename}
                  onClick={() => {
                    setActiveFile(filename)
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false)
                    }
                  }}
                  className={`w-full text-left p-2 rounded-md transition 
                             ${activeFile === filename 
                               ? 'bg-wf-red text-white font-medium' 
                               : 'text-gray-700 hover:bg-wf-gray'}`}
                >
                  {formatFileName(filename)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <main ref={mermaidContainerRef} className="max-w-3xl mx-auto px-6 py-8">
            <article className="prose prose-lg max-w-none">
              {content.files[activeFile] && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      const language = match ? match[1] : ''
                      
                      if (!inline && match) {
                        // Check if it's a mermaid diagram
                        if (language === 'mermaid') {
                          return (
                            <div className="mermaid mb-6 bg-gray-50 p-4 rounded-lg">{String(children).replace(/\n$/, '')}</div>
                          )
                        }
                        
                        // Otherwise use syntax highlighting
                        return (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={language}
                            PreTag="div"
                            className="rounded-lg shadow-sm"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        )
                      }
                      
                      return <code className={`${className} bg-gray-100 px-1 py-0.5 rounded`} {...props}>{children}</code>
                    },
                    h1: ({ children }) => <h1 className="text-3xl font-bold text-wf-red mb-6">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-bold text-wf-red mt-8 mb-4">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-bold text-wf-darkgray mt-6 mb-3">{children}</h3>,
                    a: ({ href, children }) => <a href={href} className="text-wf-red hover:underline">{children}</a>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-wf-gold pl-4 italic my-4 text-gray-700">{children}</blockquote>
                    ),
                    ul: ({ children }) => <ul className="list-disc pl-5 my-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 my-4 space-y-2">{children}</ol>
                  }}
                >
                  {processMarkdownLinks(content.files[activeFile])}
                </ReactMarkdown>
              )}
            </article>

            {/* Navigation controls */}
            <div className="flex justify-between mt-12 pt-6 border-t border-gray-200">
              {prevFile ? (
                <button
                  onClick={() => setActiveFile(prevFile)}
                  className="flex items-center text-wf-red hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {formatFileName(prevFile)}
                </button>
              ) : <div></div>}
              
              {nextFile ? (
                <button
                  onClick={() => setActiveFile(nextFile)}
                  className="flex items-center text-wf-red hover:underline"
                >
                  {formatFileName(nextFile)}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              ) : <div></div>}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
} 