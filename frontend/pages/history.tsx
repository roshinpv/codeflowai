import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';

interface Tutorial {
  project_name: string;
  title: string;
  description: string;
  created_at: string;
  file_count: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/tutorials');
      setTutorials(response.data.tutorials || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tutorials');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, project_name: string) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event propagation
    
    if (!confirm(`Are you sure you want to delete "${project_name}" tutorial?`)) {
      return;
    }
    
    try {
      setDeleting(project_name);
      await axios.delete(`/api/delete-tutorial?project_name=${project_name}`);
      setTutorials(tutorials.filter(t => t.project_name !== project_name));
    } catch (err: any) {
      alert(`Error deleting tutorial: ${err.message || 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  };

  // Format date to readable string
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Truncate description to a specific length
  const truncateText = (text: string, maxLength: number = 160) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Layout title="Tutorial History - CodeFlowAI">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tutorial History</h1>
            <p className="mt-2 text-gray-600">View and access your previously generated tutorials</p>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="btn btn-primary"
          >
            Create New
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wf-red"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-wf-red p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-wf-red" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : tutorials.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <svg className="h-12 w-12 text-gray-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No tutorials yet</h3>
            <p className="mt-2 text-gray-500">Get started by generating your first tutorial</p>
            <div className="mt-6">
              <Link href="/" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-wf-red hover:bg-opacity-90 focus:outline-none transition-colors duration-200">
                Create Tutorial
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tutorials.map((tutorial) => (
              <div 
                key={tutorial.project_name} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full border border-gray-100 relative group"
              >
                {/* Card content - make the whole card clickable except buttons */}
                <Link 
                  href={`/view/${tutorial.project_name}`}
                  className="p-6 flex-grow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-wf-red/10 text-wf-red text-xs px-2 py-1 rounded-full font-medium">
                      {tutorial.file_count} file{tutorial.file_count !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(tutorial.created_at)}
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{tutorial.title || tutorial.project_name}</h2>
                  <p className="text-gray-600 text-sm">{truncateText(tutorial.description)}</p>
                </Link>
                
                {/* Card footer */}
                <div className="px-6 py-3 bg-gray-50 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">{tutorial.project_name}</span>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleDelete(e, tutorial.project_name)}
                      disabled={deleting === tutorial.project_name}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete tutorial"
                    >
                      {deleting === tutorial.project_name ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                    
                    <Link 
                      href={`/view/${tutorial.project_name}`}
                      className="text-wf-red"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 