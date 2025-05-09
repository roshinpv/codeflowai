import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Link from 'next/link';

interface CloudDashboardProps {
  projectName: string;
}

interface CloudData {
  project_name: string;
  overall_score: number;
  readiness_level: string;
  architecture_type: string;
  scores: Record<string, number>;
  top_languages: { name: string; count: number }[];
  top_frameworks: { name: string; count: number }[];
  containerization: { docker: boolean; kubernetes: boolean };
  cicd: boolean;
  cloud_services: boolean;
  test_files: number;
  priority_recommendations: { 
    category: string; 
    description: string; 
    priority: string 
  }[];
}

const CloudDashboard: React.FC<CloudDashboardProps> = ({ projectName }) => {
  const [dashboard, setDashboard] = useState<string>('');
  const [cloudData, setCloudData] = useState<CloudData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'data'>('summary');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        if (!projectName) {
          setError('No project name provided');
          setLoading(false);
          return;
        }
        
        console.log(`Fetching cloud dashboard for project: ${projectName}`);
        setLoading(true);
        
        try {
          // Fetch both the markdown dashboard and the JSON data
          const [dashboardResponse, dataResponse] = await Promise.all([
            axios.get(`/api/output/${projectName}/cloud-dashboard`),
            axios.get(`/api/output/${projectName}/cloud-data`)
          ]);
          
          console.log("Dashboard data fetched successfully");
          setDashboard(dashboardResponse.data.cloud_dashboard);
          setCloudData(dataResponse.data);
          setLoading(false);
        } catch (apiErr: any) {
          // Handle specific API errors
          console.error('API Error:', apiErr);
          if (apiErr.response?.status === 404) {
            setError(`Project "${projectName}" not found or analysis not completed yet.`);
          } else {
            setError(`Failed to load cloud readiness dashboard: ${apiErr.message || 'Unknown error'}`);
          }
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error in dashboard component:', err);
        setError(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [projectName]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-600">Loading cloud analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-5 rounded-lg my-4">
        <h3 className="text-lg font-medium mb-2">Error Loading Dashboard</h3>
        <p>{error}</p>
        <div className="mt-6 flex space-x-4">
          <Link 
            href="/cloud-analysis" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
          >
            Run New Analysis
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Check if we have both data necessary for rendering
  if (!cloudData || !dashboard) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-5 rounded-lg my-4">
        <h3 className="text-lg font-medium mb-2">Incomplete Data</h3>
        <p>We couldn't load all the required data for this analysis. Some parts of the dashboard may be missing.</p>
        <div className="mt-6">
          <Link 
            href="/cloud-analysis" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700"
          >
            Start Fresh Analysis
          </Link>
        </div>
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

  // Function to render the data visualization tab
  const renderDataVisualization = () => {
    if (!cloudData) return null;

    // Create a score progress bar
    const createScoreBar = (score: number, maxScore: number) => {
      const percentage = (score / maxScore) * 100;
      let colorClass = 'bg-red-500';
      
      if (percentage >= 70) {
        colorClass = 'bg-green-500';
      } else if (percentage >= 40) {
        colorClass = 'bg-yellow-500';
      }
      
      return (
        <div className="w-full bg-gray-200 rounded-full h-4 my-1">
          <div 
            className={`h-4 rounded-full ${colorClass}`} 
            style={{ width: `${percentage}%` }}
          ></div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-600">0</span>
            <span className="text-gray-600">{maxScore}</span>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-8">
        {/* Overall Score Card with Gauge */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Overall Cloud Readiness</h3>
              <p className="text-gray-600 mt-1">How ready is your application for cloud deployment</p>
            </div>
            <div className="flex flex-col items-center mt-4 md:mt-0">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  {/* Background circle */}
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="54" 
                    fill="none" 
                    stroke="#e2e8f0" 
                    strokeWidth="12" 
                  />
                  {/* Score progress */}
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="54" 
                    fill="none" 
                    stroke={
                      cloudData.overall_score < 40 ? "#f56565" : 
                      cloudData.overall_score < 70 ? "#ecc94b" : 
                      "#48bb78"
                    } 
                    strokeWidth="12" 
                    strokeDasharray={`${(cloudData.overall_score / 100) * 339} 339`} 
                    strokeDashoffset={339 * 0.25} 
                    strokeLinecap="round" 
                    transform="rotate(-90 60 60)" 
                  />
                  {/* Score text */}
                  <text 
                    x="60" 
                    y="64" 
                    fill="#1a202c" 
                    fontSize="24" 
                    fontWeight="bold" 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                  >
                    {cloudData.overall_score}%
                  </text>
                </svg>
              </div>
              <div className="mt-2 text-center">
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  cloudData.readiness_level === 'Low' ? 'bg-red-100 text-red-800' : 
                  cloudData.readiness_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-green-100 text-green-800'
                }`}>
                  {cloudData.readiness_level} Readiness
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* App Summary and Tech Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* App Summary Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Application Summary</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Architecture Type</div>
                <div className="font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm1 0v14h12V3H4z" clipRule="evenodd" />
                  </svg>
                  {cloudData.architecture_type}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Top Languages</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {cloudData.top_languages.map((lang, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {lang.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Top Frameworks</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {cloudData.top_frameworks.length > 0 ? 
                    cloudData.top_frameworks.map((fw, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                        {fw.name}
                      </span>
                    )) : 
                    <span className="text-sm text-gray-500">None detected</span>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Cloud Technologies Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Cloud Technologies</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center col-span-2 sm:col-span-1">
                <div className={`w-3 h-3 rounded-full mr-2 ${cloudData.containerization.docker ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Docker</span>
                {cloudData.containerization.docker ? 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                }
              </div>
              <div className="flex items-center col-span-2 sm:col-span-1">
                <div className={`w-3 h-3 rounded-full mr-2 ${cloudData.containerization.kubernetes ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Kubernetes</span>
                {cloudData.containerization.kubernetes ? 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                }
              </div>
              <div className="flex items-center col-span-2 sm:col-span-1">
                <div className={`w-3 h-3 rounded-full mr-2 ${cloudData.cicd ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>CI/CD Pipeline</span>
                {cloudData.cicd ? 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                }
              </div>
              <div className="flex items-center col-span-2 sm:col-span-1">
                <div className={`w-3 h-3 rounded-full mr-2 ${cloudData.cloud_services ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Cloud Services</span>
                {cloudData.cloud_services ? 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                }
              </div>
              <div className="col-span-2 mt-2">
                <div className="text-sm text-gray-600">Test Files</div>
                <div className="flex items-center">
                  <span className="font-medium">{cloudData.test_files}</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    cloudData.test_files > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {cloudData.test_files > 0 ? 'Tests Found' : 'No Tests'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Score Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {Object.entries(cloudData.scores)
              .filter(([key]) => key !== 'overall')
              .sort(([, a], [, b]) => b - a)
              .map(([key, score]) => {
                const maxScore = 
                  key === 'language_compatibility' || key === 'containerization' ? 15 :
                  key === 'ci_cd' || key === 'configuration' || key === 'cloud_integration' ? 10 : 5;
                
                // Ensure score doesn't exceed the maximum possible score
                const normalizedScore = Math.min(Math.round(score), maxScore);
                const percentage = (normalizedScore / maxScore) * 100;
                let statusClass = 'text-red-600';
                
                if (percentage >= 80) {
                  statusClass = 'text-green-600';
                } else if (percentage >= 50) {
                  statusClass = 'text-yellow-600';
                }
                
                return (
                  <div key={key} className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className={`text-sm font-bold ${statusClass}`}>{normalizedScore}/{maxScore}</span>
                    </div>
                    {createScoreBar(normalizedScore, maxScore)}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Priority Improvements Card */}
        {cloudData.priority_recommendations && cloudData.priority_recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Key Areas for Improvement</h3>
            <div className="space-y-4">
              {cloudData.priority_recommendations.map((rec, index) => (
                <div key={index} className={`border-l-4 ${
                  rec.priority === 'critical' ? 'border-red-500 bg-red-50' : 
                  rec.priority === 'high' ? 'border-yellow-500 bg-yellow-50' : 
                  'border-blue-500 bg-blue-50'
                } pl-4 py-3 rounded-r-lg`}>
                  <div className="flex items-center">
                    {rec.priority === 'critical' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : rec.priority === 'high' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h.01a1 1 0 000-2H9z" clipRule="evenodd" />
                      </svg>
                    )}
                    <h4 className="font-medium">{rec.category}</h4>
                    <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${
                      rec.priority === 'critical' ? 'bg-red-200 text-red-800' : 
                      rec.priority === 'high' ? 'bg-yellow-200 text-yellow-800' : 
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{rec.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 relative z-0">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Markdown Report
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Interactive Dashboard
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="py-4">
        {activeTab === 'summary' ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={components}
            >
              {dashboard}
            </ReactMarkdown>
          </div>
        ) : (
          renderDataVisualization()
        )}
      </div>
    </div>
  );
};

export default CloudDashboard; 