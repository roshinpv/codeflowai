import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Components } from 'react-markdown';

interface CloudReadinessProps {
  projectName: string;
}

const CloudReadiness: React.FC<CloudReadinessProps> = ({ projectName }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCloudReadiness = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/output/${projectName}/cloud-readiness`);
        setReport(response.data.cloud_readiness_report);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching cloud readiness report:', err);
        setError('Failed to load cloud readiness report. The report may not be available for this project.');
        setLoading(false);
      }
    };

    if (projectName) {
      fetchCloudReadiness();
    }
  }, [projectName]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md my-4">
        <p>{error}</p>
      </div>
    );
  }

  const components: Components = {
    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
    table: ({ children }) => <table className="min-w-full border-collapse border border-gray-300 my-4">{children}</table>,
    thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
    th: ({ children }) => <th className="border border-gray-300 px-4 py-2 text-left">{children}</th>,
    td: ({ children }) => <td className="border border-gray-300 px-4 py-2">{children}</td>,
    p: ({ children }) => <p className="my-3">{children}</p>,
    ul: ({ children }) => <ul className="list-disc ml-5 my-2">{children}</ul>,
    li: ({ children }) => <li className="my-1">{children}</li>,
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          className="my-4 rounded"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-100 px-1 rounded" {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {report}
      </ReactMarkdown>
    </div>
  );
};

export default CloudReadiness; 