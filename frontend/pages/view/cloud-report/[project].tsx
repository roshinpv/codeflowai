import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import CloudReadiness from '../../../components/CloudReadiness';
import axios from 'axios';

const CloudReadinessReportPage = () => {
  const router = useRouter();
  const { project } = router.query;
  
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (project && typeof project === 'string') {
      setProjectName(project);
      setLoading(false);
    }
  }, [project]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-md max-w-lg mx-auto">
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p>{error}</p>
            <button 
              onClick={() => router.push('/')} 
              className="mt-4 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
            >
              Return to Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Cloud Readiness Report</h1>
          <div className="space-x-2">
            <button 
              onClick={() => router.push(`/view/${projectName}`)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
            >
              View Tutorial
            </button>
            <button 
              onClick={() => router.push(`/view/cloud-dashboard/${projectName}`)}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              Dashboard
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
            <h2 className="text-lg font-medium">Project: {projectName}</h2>
          </div>
          <div className="p-4">
            <CloudReadiness projectName={projectName} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CloudReadinessReportPage; 