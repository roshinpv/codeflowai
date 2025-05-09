import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import Layout from '../components/Layout'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface CloudEvaluation {
  id: string
  project_name: string
  timestamp: string
  overall_score: number
  readiness_level: string
  job_id?: string
  formatted_date?: string
  formatted_time?: string
  status?: string
  recommendations_count?: number
  data?: any
}

export default function CloudHistoryPage() {
  const [evaluations, setEvaluations] = useState<CloudEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedEvaluation, setSelectedEvaluation] = useState<CloudEvaluation | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [showReadinessInfo, setShowReadinessInfo] = useState(false)
  const [showReadinessModal, setShowReadinessModal] = useState(false)
  const [readinessModalContent, setReadinessModalContent] = useState<{level: string, explanation: string} | null>(null)
  const router = useRouter()
  const { job_id } = router.query
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Format component name function
  const formatComponentName = useCallback((key: string): string => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }, []);
  
  // Move the helper functions to useCallback
  const calculateReadinessLevel = useCallback((evaluation: CloudEvaluation): string => {
    // If we don't have component scores, use the existing readiness level
    if (!evaluation.data?.scores) {
      return evaluation.readiness_level;
    }
    
    const scores = evaluation.data.scores;
    const componentScores = Object.entries(scores)
      .filter(([key]) => key !== 'overall')
      .map(([key, value]) => ({ key, value: value as number }));
    
    // Identify critical cloud components that heavily impact readiness
    const criticalComponents = [
      'containerization',
      'configuration',
      'cloud_integration',
      'state_management',
      'infrastructure_as_code',
      'ci_cd'
    ];
    
    // Calculate the average score of critical components
    const criticalScores = componentScores
      .filter(item => criticalComponents.includes(item.key))
      .map(item => item.value);
    
    const criticalAvg = criticalScores.length > 0
      ? criticalScores.reduce((sum, score) => sum + score, 0) / criticalScores.length
      : 0;
    
    // Calculate the overall average
    const overallAvg = componentScores.length > 0
      ? componentScores.reduce((sum, item) => sum + item.value, 0) / componentScores.length
      : evaluation.overall_score;
    
    // Check for critical blockers (any critical component below threshold)
    const hasLowCriticalScores = criticalScores.some(score => score < 20);
    
    // Determine readiness level based on scores and critical components
    if (criticalAvg >= 75 && overallAvg >= 75) {
      return 'Cloud-Native';
    } else if (criticalAvg >= 60 && overallAvg >= 60 && !hasLowCriticalScores) {
      return 'Cloud-Ready';
    } else if (criticalAvg >= 40 && overallAvg >= 40) {
      return 'Cloud-Friendly';
    } else {
      return 'Cloud-Challenged';
    }
  }, []);
  
  // Helper function to get lowest scoring components
  const getLowestScoringComponents = useCallback((scores: Array<{key: string, value: number}>, count: number): string => {
    return scores
      .sort((a, b) => a.value - b.value)
      .slice(0, count)
      .map(item => item.key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
      .join(', ');
  }, []);
  
  // Add a function to get a thorough explanation of the readiness level
  const getReadinessExplanation = useCallback((evaluation: CloudEvaluation): string => {
    if (!evaluation.data?.scores) {
      return "The readiness level is based on the overall evaluation score.";
    }
    
    const scores = evaluation.data.scores;
    const componentScores = Object.entries(scores)
      .filter(([key]) => key !== 'overall')
      .map(([key, value]) => ({ key, value: value as number }));
    
    // Identify critical cloud components
    const criticalComponents = [
      'containerization',
      'configuration',
      'cloud_integration',
      'state_management',
      'infrastructure_as_code',
      'ci_cd'
    ];
    
    // Calculate averages
    const criticalScores = componentScores
      .filter(item => criticalComponents.includes(item.key))
      .map(item => item.value);
    
    const criticalAvg = criticalScores.length > 0
      ? criticalScores.reduce((sum, score) => sum + score, 0) / criticalScores.length
      : 0;
    
    const overallAvg = componentScores.length > 0
      ? componentScores.reduce((sum, item) => sum + item.value, 0) / componentScores.length
      : evaluation.overall_score;
    
    // Generate explanation based on the readiness level
    switch (evaluation.readiness_level) {
      case 'Cloud-Native':
        return `This project demonstrates excellent cloud-native practices with an overall score of ${Math.round(overallAvg)}. Critical cloud components scored an average of ${Math.round(criticalAvg)}, indicating strong containerization, configuration management, and cloud integration capabilities.`;
      case 'Cloud-Ready':
        return `This project is well-prepared for cloud deployment with an overall score of ${Math.round(overallAvg)}. Critical cloud components scored an average of ${Math.round(criticalAvg)}, showing good practices in key areas, though there's still room for improvement.`;
      case 'Cloud-Friendly':
        return `This project can run in the cloud with some adjustments. The overall score of ${Math.round(overallAvg)} and critical components score of ${Math.round(criticalAvg)} suggest that while basic cloud compatibility exists, improvements are needed in key areas like ${getLowestScoringComponents(componentScores, 2)}.`;
      case 'Cloud-Challenged':
        return `This project needs significant work before being cloud-ready. The overall score of ${Math.round(overallAvg)} and critical components score of ${Math.round(criticalAvg)} indicate substantial challenges in cloud adoption, particularly in ${getLowestScoringComponents(componentScores, 3)}.`;
      default:
        return `This project has a readiness level of "${evaluation.readiness_level}" with an overall score of ${Math.round(overallAvg)}.`;
    }
  }, [getLowestScoringComponents]);
  
  // Make this function use useCallback for consistency
  const prepareAnalysisData = useCallback((evaluation: CloudEvaluation): string => {
    if (!evaluation.data?.scores) {
      return "Insufficient data available for comprehensive analysis";
    }
    
    const scores = evaluation.data.scores;
    const componentScores = Object.entries(scores)
      .filter(([key]) => key !== 'overall')
      .map(([key, value]) => ({ key, value: value as number }));
    
    // Critical cloud components
    const criticalComponents = [
      'containerization',
      'configuration',
      'cloud_integration',
      'state_management',
      'infrastructure_as_code',
      'ci_cd'
    ];
    
    // Calculate key metrics
    const criticalScores = componentScores
      .filter(item => criticalComponents.includes(item.key))
      .map(item => item.value);
    
    const criticalAvg = criticalScores.length > 0
      ? criticalScores.reduce((sum, score) => sum + score, 0) / criticalScores.length
      : 0;
    
    const overallAvg = componentScores.length > 0
      ? componentScores.reduce((sum, item) => sum + item.value, 0) / componentScores.length
      : evaluation.overall_score;
    
    // Calculate readiness level based on scores
    const calculatedReadinessLevel = calculateReadinessLevel(evaluation);
    const originalReadinessLevel = evaluation.readiness_level;
    const readinessExplanation = getReadinessExplanation(evaluation);

    // Get technology stack info if available
    let techStackSummary = "No technology stack information available";
    if (evaluation.data?.technology_stack) {
      const techCategories = Object.entries(evaluation.data.technology_stack)
        .filter(([key]) => key !== 'files' && Object.keys(evaluation.data.technology_stack[key]).length > 0)
        .map(([category, items]) => {
          const techs = Object.keys(items as object).slice(0, 5).join(', ');
          return `${category}: ${techs}`;
        });
      
      techStackSummary = techCategories.join(' | ');
    }
    
    // Get the lowest scoring components that need improvement
    const lowestScoringComponents = componentScores
      .sort((a, b) => a.value - b.value)
      .slice(0, 3);
      
    // Get the critical components that need improvement
    const criticalComponentsNeedingImprovement = componentScores
      .filter(item => criticalComponents.includes(item.key) && item.value < 60)
      .sort((a, b) => a.value - b.value);
    
    // Format the data in a structured way for LLM
    return `
PROJECT ANALYSIS DATA:
Project: ${evaluation.project_name}
Original Overall Score: ${Math.round(evaluation.overall_score)}/100
Calculated Overall Score: ${Math.round(overallAvg)}/100
${evaluation.data?.correctedScore ? "Note: Overall score was recalculated due to significant discrepancy with component scores." : ""}

Original Readiness Level: ${originalReadinessLevel}
Calculated Readiness Level: ${calculatedReadinessLevel}
${calculatedReadinessLevel !== originalReadinessLevel ? "Note: Readiness level was recalculated based on component scores." : ""}

Date: ${evaluation.formatted_date || evaluation.timestamp}

READINESS EXPLANATION:
${readinessExplanation}

ALL COMPONENT SCORES:
${componentScores.map(item => `- ${formatComponentName(item.key)}: ${Math.round(item.value)}/100`).join('\n')}

CRITICAL CLOUD COMPONENTS AVG: ${Math.round(criticalAvg)}/100
${criticalComponentsNeedingImprovement.length > 0 ? 
`Critical components needing attention: ${criticalComponentsNeedingImprovement.map(item => `${formatComponentName(item.key)} (${Math.round(item.value)}/100)`).join(', ')}` : 
'All critical components have acceptable scores.'}

TECHNOLOGY STACK:
${techStackSummary}

TOP 3 LOWEST SCORING COMPONENTS:
${lowestScoringComponents.map(item => `${formatComponentName(item.key)}: ${Math.round(item.value)}/100`).join('\n')}

READINESS CRITERIA SUMMARY:
- Cloud-Native: 75+ score in critical components and overall. Fully optimized for cloud environments.
- Cloud-Ready: 60+ score in critical components and overall. Ready for cloud with minimal changes.
- Cloud-Friendly: 40+ score. Can work in cloud environments but requires moderate modifications.
- Cloud-Challenged: Below 40 score. Significant architectural changes needed for cloud deployment.
`;
  }, [calculateReadinessLevel, getReadinessExplanation, formatComponentName]);
  
  // Add a function to calculate accurate overall score based on individual scores
  const getAccurateScore = useCallback((evaluation: CloudEvaluation): number => {
    // If we already have a corrected score in the data, use that
    if (evaluation.data?.correctedScore && evaluation.data.scores?.overall) {
      return evaluation.data.scores.overall;
    }
    
    // If we have component scores, calculate the average
    if (evaluation.data?.scores) {
      const componentScores = Object.entries(evaluation.data.scores)
        .filter(([key]) => key !== 'overall')
        .map(([, value]) => value as number);
        
      if (componentScores.length > 0) {
        const calculatedScore = componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length;
        
        // Check if there's a significant discrepancy
        const reportedScore = evaluation.data.scores.overall || evaluation.overall_score;
        const discrepancy = Math.abs(reportedScore - calculatedScore);
        
        // Use calculated score if there's a big discrepancy
        if (discrepancy > 20 || reportedScore > calculatedScore * 1.5) {
          return calculatedScore;
        }
      }
      
      // Otherwise use the reported overall score from data
      if (evaluation.data.scores.overall) {
        return evaluation.data.scores.overall;
      }
    }
    
    // Fall back to the evaluation's overall score
    return evaluation.overall_score;
  }, []);
  
  // Fetch evaluation details - update to include cleanup logic
  const fetchEvaluationDetails = async (evaluationId: string) => {
    let isCancelled = false;
    setDetailsLoading(true);
    
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      
      const response = await axios.get(`/api/cloud-evaluation/${evaluationId}`, { signal });
      
      // If the operation was cancelled, don't update state
      if (isCancelled) return;
      
      if (response.data) {
        // Process the response data to ensure score consistency
        const evalData = response.data.data;
        
        // Calculate average of component scores for more accurate overall score
        if (evalData.scores) {
          // Extract component scores (all except 'overall')
          const componentScores = Object.entries(evalData.scores)
            .filter(([key]) => key !== 'overall')
            .map(([, value]) => value as number);
          
          // Calculate the average if we have component scores
          if (componentScores.length > 0) {
            const calculatedOverall = componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length;
            
            // Check if there's a significant discrepancy between reported overall and calculated
            const reportedOverall = evalData.scores.overall || 0;
            const discrepancy = Math.abs(reportedOverall - calculatedOverall);
            
            // If discrepancy > 20 points or the reported is more than 150% of calculated, use calculated
            if (discrepancy > 20 || reportedOverall > calculatedOverall * 1.5) {
              console.log(`Correcting discrepant score: reported=${reportedOverall}, calculated=${calculatedOverall}`);
              evalData.scores.overall = calculatedOverall;
              evalData.correctedScore = true; // Flag that we corrected this
            }
          }
        }
        
        // Update the selected evaluation with full data
        setSelectedEvaluation(prev => {
          if (!prev || isCancelled) return prev;
          
          // Get the overall score from data, or calculate if needed
          let overallScore = prev.overall_score;
          if (evalData.scores) {
            if (evalData.correctedScore) {
              overallScore = evalData.scores.overall;
            } else if (evalData.scores.overall) {
              overallScore = evalData.scores.overall;
            }
          }
          
          // Create a merged evaluation with comprehensive data for LLM
          const evaluationWithData = { 
            ...prev, // Keep existing properties from the evaluation
            overall_score: overallScore,
            data: {
              ...evalData, // Add the new detailed data
              ...(prev.data || {}), // But preserve any existing data properties
            }
          };
          
          // Add the analysis data that will be sent to LLM
          evaluationWithData.data.analysisDataForLLM = prepareAnalysisData(evaluationWithData);
          
          return evaluationWithData;
        });
      }
    } catch (err) {
      if (!isCancelled) {
        console.error('Error fetching evaluation details:', err);
      }
    } finally {
      if (!isCancelled) {
        setDetailsLoading(false);
      }
    }
    
    // Return a cleanup function
    return () => {
      isCancelled = true;
    };
  };
  
  // Show details modal for an evaluation
  const handleShowDetails = (evaluation: CloudEvaluation) => {
    setSelectedEvaluation(evaluation)
    setShowModal(true)
    
    // For both regular evaluations and completed jobs with an ID, fetch details
    if (evaluation.id && !evaluation.id.startsWith('job_')) {
      fetchEvaluationDetails(evaluation.id)
    } else if (evaluation.job_id && evaluation.status === 'completed') {
      // If it's a completed job with job_id but no full data, try to get its details
      // This handles cases where the job completed but we don't have the full evaluation data yet
      try {
        // First try by evaluation ID if available
        if (evaluation.id && !evaluation.id.startsWith('job_')) {
          fetchEvaluationDetails(evaluation.id)
        } else {
          // Otherwise try by project name
          const projectEval = evaluations.find(e => 
            e.project_name === evaluation.project_name && 
            e.id && !e.id.startsWith('job_') &&
            e.status === 'completed'
          )
          if (projectEval) {
            fetchEvaluationDetails(projectEval.id)
          }
        }
      } catch (err) {
        console.error('Error fetching completed job details:', err)
      }
    }
    
    // For failed jobs, show basic info only
    // The modal will display appropriate UI based on the status
  }
  
  // Close modal
  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedEvaluation(null)
  }

  // Modify the fetchData function in useEffect to also preserve readiness modal state 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log('useEffect triggered with job_id:', job_id, 'showModal:', showModal, 'showReadinessModal:', showReadinessModal);
    
    // Keep track of whether the component is mounted
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return false;
      
      setLoading(true)
      setError('')
      
      try {
        console.log('Fetching cloud history data...');
        // Call the cloud-history endpoint
        const response = await axios.get('/api/cloud-history?limit=50')
        
        if (!isMounted) return false;
        
        if (response.data && response.data.evaluations) {
          console.log('Received', response.data.evaluations.length, 'evaluations');
          // Store the current selected evaluation ID before updating the list
          const currentSelectedId = selectedEvaluation?.id
          
          // Store the readiness modal state
          const currentReadinessContent = readinessModalContent
          
          // Process evaluations to ensure accurate readiness scores
          const processedEvaluations = response.data.evaluations.map((evaluation: CloudEvaluation) => {
            // If the evaluation has component scores, recalculate the overall score if needed
            if (evaluation.data?.scores) {
              const accurateScore = getAccurateScore(evaluation);
              if (Math.abs(accurateScore - evaluation.overall_score) > 5) {
                console.log('Correcting score for', evaluation.project_name, 'from', evaluation.overall_score, 'to', accurateScore);
                return {
                  ...evaluation,
                  overall_score: accurateScore,
                  data: {
                    ...evaluation.data,
                    correctedScore: true
                  }
                };
              }
            }
            return evaluation;
          });
          
          setEvaluations(processedEvaluations)
          setLoading(false)
          
          // If we had a selected evaluation and the modal was open, find the updated version
          if (currentSelectedId && showModal && isMounted) {
            console.log('Updating selected evaluation in modal, ID:', currentSelectedId);
            const updatedEvaluation = processedEvaluations.find(
              (e: CloudEvaluation) => e.id === currentSelectedId
            )
            
            // If found, update the selected evaluation but preserve modal state
            if (updatedEvaluation) {
              const newReadinessLevel = updatedEvaluation.data?.scores 
                ? calculateReadinessLevel(updatedEvaluation) 
                : updatedEvaluation.readiness_level;
              
              console.log('Updated readiness level:', newReadinessLevel, 'vs original:', updatedEvaluation.readiness_level);
              
              setSelectedEvaluation(prev => {
                if (!prev || !isMounted) return prev;
                return {
                  ...updatedEvaluation,
                  overall_score: getAccurateScore(updatedEvaluation),
                  readiness_level: newReadinessLevel,
                  data: {
                    ...updatedEvaluation.data,
                    ...(prev.data || {}) // Preserve the detailed data we already loaded
                  }
                };
              });
            }
          }
          
          // Preserve the readiness explanation modal if open
          if (showReadinessModal && currentReadinessContent && isMounted) {
            // If the modal was for a specific evaluation, update its content if needed
            if (currentReadinessContent && currentSelectedId) {
              const updatedEvaluation = processedEvaluations.find(
                (e: CloudEvaluation) => e.id === currentSelectedId
              )
              
              if (updatedEvaluation && isMounted) {
                // Only update if the readiness level has changed
                const updatedLevel = updatedEvaluation.data?.scores ? 
                  calculateReadinessLevel(updatedEvaluation) : 
                  updatedEvaluation.readiness_level
                
                if (updatedLevel !== currentReadinessContent.level) {
                  console.log('Updating readiness modal content from', currentReadinessContent.level, 'to', updatedLevel);
                  setReadinessModalContent({
                    level: updatedLevel,
                    explanation: getReadinessExplanation(updatedEvaluation)
                  })
                }
              }
            }
          }
          
          // Check if we need to continue polling (if job_id is present and its status is not completed)
          if (job_id && isMounted) {
            const jobEvaluation = processedEvaluations.find(
              (e: CloudEvaluation) => e.job_id === job_id
            )
            
            if (jobEvaluation && jobEvaluation.status === 'running') {
              // Continue polling if job is still running
              return true
            }
          }
        } else {
          throw new Error('Invalid response format')
        }
        return false
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching cloud history:', err)
          setError('Failed to load cloud readiness history. Please try again.')
          setLoading(false)
        }
        return false
      }
    }
    
    // Initial fetch
    fetchData()
    
    // Set up periodic refreshing if job_id is present
    if (job_id) {
      // Clear any existing timer
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      
      // Set new refresh timer (every 5 seconds)
      refreshTimerRef.current = setInterval(async () => {
        if (!isMounted) {
          if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current)
            refreshTimerRef.current = null
          }
          return;
        }
        const shouldContinue = await fetchData()
        if ((!shouldContinue || !isMounted) && refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current)
          refreshTimerRef.current = null
        }
      }, 5000)
    }
    
    // Cleanup
    return () => {
      isMounted = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [job_id, showModal, showReadinessModal, readinessModalContent, getAccurateScore, calculateReadinessLevel, getReadinessExplanation]) // Updated dependency array
  
  // Also modify the handleRefresh function to preserve readiness modal state
  const handleRefresh = async () => {
    console.log('Manual refresh triggered');
    setLoading(true)
    setError('')
    
    // Use AbortController for cancellation
    const controller = new AbortController();
    const signal = controller.signal;
    
    try {
      console.log('Manually fetching cloud history data...');
      const response = await axios.get('/api/cloud-history?limit=50', { signal })
      if (response.data && response.data.evaluations) {
        console.log('Received', response.data.evaluations.length, 'evaluations during manual refresh');
        // Store the current selected evaluation ID before updating the list
        const currentSelectedId = selectedEvaluation?.id
        
        // Store the readiness modal state
        const currentReadinessContent = readinessModalContent
        
        // Process evaluations to ensure accurate readiness scores
        const processedEvaluations = response.data.evaluations.map((evaluation: CloudEvaluation) => {
          // If the evaluation has component scores, recalculate the overall score if needed
          if (evaluation.data?.scores) {
            const accurateScore = getAccurateScore(evaluation);
            if (Math.abs(accurateScore - evaluation.overall_score) > 5) {
              console.log('Manually correcting score for', evaluation.project_name, 'from', evaluation.overall_score, 'to', accurateScore);
              return {
                ...evaluation,
                overall_score: accurateScore,
                data: {
                  ...evaluation.data,
                  correctedScore: true
                }
              };
            }
          }
          return evaluation;
        });
        
        // Update the evaluations list
        setEvaluations(processedEvaluations)
        
        // If we had a selected evaluation and the modal was open, find the updated version
        if (currentSelectedId && showModal) {
          console.log('Manually updating selected evaluation, ID:', currentSelectedId);
          const updatedEvaluation = processedEvaluations.find(
            (e: CloudEvaluation) => e.id === currentSelectedId
          )
          
          // If found, update the selected evaluation but preserve modal state
          if (updatedEvaluation) {
            const newReadinessLevel = updatedEvaluation.data?.scores 
              ? calculateReadinessLevel(updatedEvaluation) 
              : updatedEvaluation.readiness_level;
            
            console.log('Manually updated readiness level:', newReadinessLevel, 'vs original:', updatedEvaluation.readiness_level);
            
            setSelectedEvaluation(prev => {
              if (!prev) return null;
              return {
                ...updatedEvaluation,
                overall_score: getAccurateScore(updatedEvaluation),
                readiness_level: newReadinessLevel,
                data: {
                  ...updatedEvaluation.data,
                  ...(prev.data || {}) // Preserve the detailed data we already loaded
                }
              };
            });
          }
        }
        
        // Preserve the readiness explanation modal if open
        if (showReadinessModal && currentReadinessContent) {
          // If the modal was for a specific evaluation, update its content if needed
          if (currentReadinessContent && currentSelectedId) {
            const updatedEvaluation = processedEvaluations.find(
              (e: CloudEvaluation) => e.id === currentSelectedId
            )
            
            if (updatedEvaluation) {
              // Only update if the readiness level has changed
              const updatedLevel = updatedEvaluation.data?.scores ? 
                calculateReadinessLevel(updatedEvaluation) : 
                updatedEvaluation.readiness_level
              
              if (updatedLevel !== currentReadinessContent.level) {
                console.log('Manually updating readiness modal content from', currentReadinessContent.level, 'to', updatedLevel);
                setReadinessModalContent({
                  level: updatedLevel,
                  explanation: getReadinessExplanation(updatedEvaluation)
                })
              }
            }
          }
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Manual refresh request cancelled:', err.message);
      } else {
        console.error('Error refreshing cloud history:', err)
        setError('Failed to refresh cloud readiness history.')
      }
    } finally {
      setLoading(false)
    }
    
    return () => {
      controller.abort();
    };
  }
  
  // Add an effect to update job_id from URL
  useEffect(() => {
    // Extract job_id from query param
    const jobIdParam = router.query.job_id
    if (jobIdParam && typeof jobIdParam === 'string') {
      // If there's a job ID in the URL and we've loaded evaluations, check if it exists
      if (evaluations.length > 0) {
        const jobExists = evaluations.some(e => e.job_id === jobIdParam)
        if (jobExists) {
          // If job exists in our evaluations list, scroll to it
          const element = document.getElementById(`job-${jobIdParam}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
    }
  }, [router.query.job_id, evaluations])
  
  // Get readiness level color class
  const getReadinessColorClass = (level: string) => {
    switch (level) {
      case 'Cloud-Native': return 'bg-green-100 text-green-800 border-green-200'
      case 'Cloud-Ready': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Cloud-Friendly': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Cloud-Challenged': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  // Add a new function to show the readiness explanation modal:
  const handleShowReadinessInfo = (evaluation: CloudEvaluation) => {
    const level = evaluation.data?.scores ? calculateReadinessLevel(evaluation) : evaluation.readiness_level
    const explanation = getReadinessExplanation(evaluation)
    setReadinessModalContent({
      level,
      explanation
    })
    setShowReadinessModal(true)
  }
  
  // Return loading state
  if (loading) {
    return (
      <Layout title="Cloud Readiness History">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wf-red"></div>
          </div>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout title="Cloud Readiness History">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cloud Readiness History</h1>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wf-red"
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
            <button 
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wf-red"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        
        {job_id && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Tracking job: {job_id}. The page will automatically refresh to show job status updates.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {evaluations.length === 0 && !error ? (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No evaluations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start by analyzing a project for cloud readiness.
            </p>
            <div className="mt-6">
              <Link
                href="/cloud-analysis"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-wf-red hover:bg-wf-red/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wf-red"
              >
                Start Analysis
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Readiness Score
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Readiness Level
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                    {showDebug && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                        Debug
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {evaluations.map((evaluation) => (
                    <tr 
                      key={evaluation.id} 
                      id={`job-${evaluation.job_id || evaluation.id}`}
                      className={`hover:bg-gray-50 ${evaluation.job_id === job_id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {(evaluation.status === 'completed' || !evaluation.status) ? (
                            <button 
                              onClick={() => handleShowDetails(evaluation)}
                              className="hover:text-wf-red hover:underline"
                            >
                              {evaluation.project_name}
                            </button>
                          ) : (
                            <span>{evaluation.project_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {evaluation.formatted_date || evaluation.timestamp.split('T')[0]}
                        </div>
                        <div className="text-xs text-gray-500">
                          {evaluation.formatted_time || evaluation.timestamp.split('T')[1]?.split('.')[0]}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {evaluation.status === 'running' ? (
                            <span className="text-gray-500">Processing...</span>
                          ) : (
                            <div>
                              <span className="font-medium">{Math.round(getAccurateScore(evaluation))}</span>
                              <span className="text-gray-500">/100</span>
                              <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className="bg-wf-red h-1.5 rounded-full" 
                                  style={{ width: `${Math.min(100, Math.round(getAccurateScore(evaluation)))}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {evaluation.status === 'running' ? (
                          <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border-blue-200">
                            Processing
                          </span>
                        ) : (
                          <div className="flex items-center">
                            <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getReadinessColorClass(evaluation.data?.scores ? calculateReadinessLevel(evaluation) : evaluation.readiness_level)}`}>
                              {evaluation.data?.scores ? calculateReadinessLevel(evaluation) : evaluation.readiness_level}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowReadinessInfo(evaluation);
                              }}
                              className="ml-1 text-gray-400 hover:text-wf-red focus:outline-none"
                              title="View readiness level explanation"
                              aria-label="View readiness level explanation"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {evaluation.status === 'running' ? (
                          <div className="flex items-center">
                            <div className="mr-2 animate-pulse h-2 w-2 bg-blue-600 rounded-full"></div>
                            <span className="text-sm text-blue-600">Running</span>
                          </div>
                        ) : evaluation.status === 'failed' ? (
                          <div className="flex items-center">
                            <div className="mr-2 h-2 w-2 bg-red-600 rounded-full"></div>
                            <span className="text-sm text-red-600">Failed</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="mr-2 h-2 w-2 bg-green-600 rounded-full"></div>
                            <span className="text-sm text-green-600">Completed</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {(evaluation.status === 'completed' || !evaluation.status) ? (
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleShowDetails(evaluation)}
                              className="text-wf-red hover:text-wf-red/80"
                            >
                              View Analysis
                            </button>
                          </div>
                        ) : evaluation.status === 'running' ? (
                          <span className="text-gray-400">Processing...</span>
                        ) : (
                          <div className="flex space-x-3">
                            <span className="text-gray-400">Failed</span>
                            <button
                              onClick={() => handleShowDetails(evaluation)}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              View Details
                            </button>
                          </div>
                        )}
                      </td>
                      {showDebug && (
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono bg-yellow-50">
                          <div>ID: {evaluation.id}</div>
                          <div>Status: {evaluation.status || 'undefined'}</div>
                          <div>Job ID: {evaluation.job_id || 'none'}</div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Detail Modal */}
        {showModal && selectedEvaluation && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              
              {/* Modal Content */}
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          <span className="text-wf-red">{selectedEvaluation.project_name}</span> - Cloud Readiness Analysis
                        </h3>
                        <button
                          onClick={handleCloseModal}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {detailsLoading ? (
                        <div className="flex justify-center items-center h-64">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wf-red"></div>
                        </div>
                      ) : selectedEvaluation.status === 'failed' ? (
                        // Special layout for failed jobs
                        <div className="mt-4 max-h-[70vh] overflow-y-auto">
                          <div className="bg-red-50 p-6 rounded-lg border border-red-200 mb-6">
                            <div className="flex items-center mb-4">
                              <div className="mr-3 bg-red-100 p-2 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <h4 className="text-lg font-medium text-red-800">Analysis Failed</h4>
                            </div>
                            <p className="text-red-700 mb-4">
                              The analysis for this project could not be completed. This might be due to:
                            </p>
                            <ul className="list-disc list-inside text-red-700 mb-4 space-y-1">
                              <li>Invalid repository URL or access issues</li>
                              <li>Issues with the file structure or content</li>
                              <li>GitHub API rate limits (if applicable)</li>
                              <li>Server-side processing errors</li>
                            </ul>
                            <div className="mt-4">
                              <h5 className="font-medium mb-2 text-red-800">Project Information:</h5>
                              <div className="space-y-2 text-red-700">
                                <div className="flex items-center">
                                  <span className="w-32 flex-shrink-0">Project Name:</span>
                                  <span className="font-medium">{selectedEvaluation.project_name}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="w-32 flex-shrink-0">Request Date:</span>
                                  <span>{selectedEvaluation.formatted_date} {selectedEvaluation.formatted_time}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="w-32 flex-shrink-0">Job ID:</span>
                                  <span className="font-mono text-sm">{selectedEvaluation.job_id}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-6">
                              <button
                                onClick={() => {
                                  setShowModal(false);
                                  router.push('/cloud-analysis');
                                }}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                Try Analysis Again
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Regular layout for completed evaluations
                        <div className="mt-4 max-h-[80vh] overflow-y-auto">
                          {/* Main Overview */}
                          <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-800">Cloud Readiness Overview</h4>
                              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getReadinessColorClass(selectedEvaluation.readiness_level)}`}>
                                {selectedEvaluation.readiness_level}
                              </span>
                            </div>

                            <div className="bg-wf-red/5 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between">
                              <div className="flex flex-col items-center mb-4 sm:mb-0">
                                <span className="text-gray-500 text-sm">Overall Score</span>
                                <span className="text-3xl font-bold text-wf-red">
                                  {Math.round(selectedEvaluation.data?.scores?.overall || selectedEvaluation.overall_score)}
                                </span>
                                <span className="text-xs text-gray-500">out of 100</span>
                                {selectedEvaluation.data?.correctedScore && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mt-1">Recalculated</span>
                                )}
                              </div>
                              
                              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
                              
                              <div className="flex flex-col items-center mb-4 sm:mb-0">
                                <span className="text-gray-500 text-sm">Analysis Date</span>
                                <span className="text-md font-medium">{selectedEvaluation.formatted_date}</span>
                                <span className="text-xs text-gray-500">{selectedEvaluation.formatted_time}</span>
                              </div>
                              
                              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
                              
                              <div className="flex flex-col items-center">
                                <span className="text-gray-500 text-sm">Recommendations</span>
                                <span className="text-xl font-medium">{selectedEvaluation.data?.recommendations?.length || selectedEvaluation.recommendations_count || 0}</span>
                                <span className="text-xs text-gray-500">improvement areas</span>
                              </div>
                            </div>

                            {selectedEvaluation.data?.correctedScore && (
                              <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800">
                                <p>
                                  <strong>Note:</strong> The overall score has been recalculated to better reflect the individual component scores.
                                  There was a significant discrepancy between the reported overall score and the average of component scores.
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Summary Card */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                              <h4 className="text-md font-medium mb-3 text-gray-800">Project Analysis</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Project Name:</span>
                                  <span className="text-sm font-medium">{selectedEvaluation.project_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">ID:</span>
                                  <span className="text-sm font-mono text-xs">{selectedEvaluation.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Date:</span>
                                  <span className="text-sm">{selectedEvaluation.formatted_date} {selectedEvaluation.formatted_time}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500">Status:</span>
                                  <span className="text-sm font-medium text-green-600">Completed</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Score Breakdown */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                              <h4 className="text-md font-medium mb-3 text-gray-800">Score Breakdown</h4>
                              {selectedEvaluation.data?.scores ? (
                                <div className="space-y-3 max-h-[30vh] overflow-y-auto">
                                  {/* Overall score first */}
                                  <div className="mb-2 pb-2 border-b border-gray-100">
                                    <div className="flex items-center">
                                      <div className="w-full">
                                        <div className="flex justify-between mb-1">
                                          <span className="text-sm font-medium text-gray-800">
                                            Overall Score
                                            {selectedEvaluation.data?.correctedScore && (
                                              <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded ml-2">Recalculated</span>
                                            )}
                                          </span>
                                          <span className="text-sm font-bold">
                                            {Math.round(selectedEvaluation.data?.scores?.overall || selectedEvaluation.overall_score)}/100
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                          <div 
                                            className="bg-wf-red h-3 rounded-full" 
                                            style={{ width: `${Math.round(selectedEvaluation.data?.scores?.overall || selectedEvaluation.overall_score)}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Individual scores */}
                                  {Object.entries(selectedEvaluation.data.scores)
                                    .filter(([key]) => key !== 'overall')
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .map(([key, score]) => (
                                      <div key={key} className="flex items-center">
                                        <div className="w-full">
                                          <div className="flex justify-between mb-1">
                                            <span className="text-sm text-gray-800">
                                              {formatComponentName(key)}
                                            </span>
                                            <span className="text-sm">{Math.round(score as number)}/100</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                              className="bg-wf-red/70 h-2 rounded-full" 
                                              style={{ width: `${Math.round(score as number)}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">Score details not available</div>
                              )}
                            </div>
                          </div>
                          
                          {/* Technology Stack & Recommendations */}
                          <div className="grid grid-cols-1 gap-6 mb-6">
                            {/* Technology Stack */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                              <h4 className="text-md font-medium mb-3 text-gray-800">Technology Stack</h4>
                              {selectedEvaluation.data?.technology_stack ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {Object.entries(selectedEvaluation.data.technology_stack)
                                    .filter(([key]) => key !== 'files' && Object.keys(selectedEvaluation.data.technology_stack[key]).length > 0)
                                    .map(([category, items]) => (
                                      <div key={category} className="bg-gray-50 p-3 rounded-md">
                                        <h5 className="text-sm font-medium text-gray-700 capitalize mb-2">{category.replace('_', ' ')}</h5>
                                        <div className="flex flex-wrap gap-1">
                                          {Object.entries(items as object).map(([item, count], i) => (
                                            <span key={i} className="text-xs px-2 py-1 bg-gray-200 rounded-full">
                                              {item} {count && count > 1 ? `(${count})` : ''}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">Technology stack details not available</div>
                              )}
                            </div>
                          </div>
                          
                          {/* Readiness Level Explanation - new section */}
                          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-md font-medium text-gray-800">Readiness Level Analysis</h4>
                              <div className="flex items-center">
                                {selectedEvaluation.data?.scores && 
                                  calculateReadinessLevel(selectedEvaluation) !== selectedEvaluation.readiness_level && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mr-2">
                                    Recalculated
                                  </span>
                                )}
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getReadinessColorClass(selectedEvaluation.data?.scores ? calculateReadinessLevel(selectedEvaluation) : selectedEvaluation.readiness_level)}`}>
                                  {selectedEvaluation.data?.scores ? calculateReadinessLevel(selectedEvaluation) : selectedEvaluation.readiness_level}
                                </span>
                              </div>
                            </div>
                            <div className="prose prose-sm max-w-none text-gray-700">
                              <p>{getReadinessExplanation(selectedEvaluation)}</p>
                              
                              {selectedEvaluation.data?.scores && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                                  <h5 className="font-medium text-sm mb-2">Component Score Summary</h5>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {Object.entries(selectedEvaluation.data.scores)
                                      .filter(([key]) => key !== 'overall')
                                      .sort(([, a], [, b]) => (b as number) - (a as number))
                                      .map(([key, score]) => {
                                        const scoreValue = Math.round(score as number);
                                        let scoreColor = "bg-red-500";
                                        if (scoreValue >= 70) {
                                          scoreColor = "bg-green-500";
                                        } else if (scoreValue >= 40) {
                                          scoreColor = "bg-yellow-500";
                                        }

                                        // Check if this is a critical component
                                        const criticalComponents = [
                                          'containerization',
                                          'configuration',
                                          'cloud_integration',
                                          'state_management',
                                          'infrastructure_as_code',
                                          'ci_cd'
                                        ];
                                        const isCritical = criticalComponents.includes(key);

                                        return (
                                          <div key={key} className="flex items-center text-xs">
                                            <div className={`h-2 w-2 rounded-full mr-1 ${scoreColor}`}></div>
                                            <span className={`truncate ${isCritical ? 'font-semibold' : ''}`}>
                                              {formatComponentName(key)}:
                                              {isCritical && <span className="ml-1 text-xs text-gray-500">(critical)</span>}
                                            </span>
                                            <span className="font-medium ml-1">{scoreValue}</span>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                              
                              <button 
                                onClick={() => setShowReadinessInfo(!showReadinessInfo)}
                                className="text-sm text-wf-red hover:text-wf-red/80 mt-3 inline-flex items-center"
                              >
                                {showReadinessInfo ? 'Hide' : 'Show'} readiness level criteria
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform ${showReadinessInfo ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
                              {showReadinessInfo && (
                                <div className="mt-2 text-xs space-y-2 border-t pt-2">
                                  <div className="flex items-start">
                                    <span className={`inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none rounded-full bg-green-100 text-green-800`}>Cloud-Native</span>
                                    <span>75+ score in critical components and overall. Fully optimized for cloud environments.</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className={`inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none rounded-full bg-yellow-100 text-yellow-800`}>Cloud-Ready</span>
                                    <span>60+ score in critical components and overall. Ready for cloud with minimal changes.</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className={`inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none rounded-full bg-orange-100 text-orange-800`}>Cloud-Friendly</span>
                                    <span>40+ score in components. Can work in cloud with some modifications.</span>
                                  </div>
                                  <div className="flex items-start">
                                    <span className={`inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none rounded-full bg-red-100 text-red-800`}>Cloud-Challenged</span>
                                    <span>Below 40 score. Significant changes needed for cloud deployment.</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Recommendations */}
                          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
                            <h4 className="text-md font-medium mb-3 text-gray-800">Key Recommendations</h4>
                            {selectedEvaluation.data?.recommendations ? (
                              <div className="space-y-4">
                                <div className="flex mb-3 border-b pb-2">
                                  <div className="w-24 font-medium text-sm text-gray-500">Priority</div>
                                  <div className="w-32 font-medium text-sm text-gray-500">Category</div>
                                  <div className="flex-1 font-medium text-sm text-gray-500">Recommendation</div>
                                </div>
                                <div className="max-h-[40vh] overflow-y-auto space-y-3">
                                  {selectedEvaluation.data.recommendations
                                    .slice(0, 10)
                                    .map((rec: any, i: number) => (
                                      <div key={i} className="flex py-2 border-b border-gray-100">
                                        <div className="w-24">
                                          {rec.priority === 'high' ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">High</span>
                                          ) : rec.priority === 'medium' ? (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Medium</span>
                                          ) : (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Low</span>
                                          )}
                                        </div>
                                        <div className="w-32 text-sm text-gray-600 capitalize">{rec.category?.replace('_', ' ')}</div>
                                        <div className="flex-1 text-sm text-gray-800">{rec.description}</div>
                                      </div>
                                    ))}
                                </div>
                                {selectedEvaluation.data.recommendations.length > 10 && (
                                  <div className="text-sm text-center text-gray-500 pt-2">
                                    Showing 10 of {selectedEvaluation.data.recommendations.length} recommendations
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">Recommendations not available</div>
                            )}
                          </div>
                          
                          {/* Other Analysis Data - only if available */}
                          {selectedEvaluation.data?.cloud_readiness_analysis && (
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
                              <h4 className="text-md font-medium mb-3 text-gray-800">Cloud Readiness Analysis</h4>
                              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                                {selectedEvaluation.data.cloud_readiness_analysis}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={handleCloseModal}
                  >
                    Close Analysis
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Readiness explanation modal */}
        {showReadinessModal && readinessModalContent && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowReadinessModal(false)}>
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              
              <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:h-10 sm:w-10" 
                        style={{backgroundColor: readinessModalContent.level === 'Cloud-Native' ? '#d1fae5' : readinessModalContent.level === 'Cloud-Ready' ? '#fef3c7' : readinessModalContent.level === 'Cloud-Friendly' ? '#ffedd5' : '#fee2e2'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          style={{color: readinessModalContent.level === 'Cloud-Native' ? '#059669' : readinessModalContent.level === 'Cloud-Ready' ? '#b45309' : readinessModalContent.level === 'Cloud-Friendly' ? '#9a3412' : '#b91c1c'}}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="ml-3 text-lg leading-6 font-medium text-gray-900">
                        <span className={`px-2 py-1 text-sm rounded-full ${getReadinessColorClass(readinessModalContent.level)}`}>
                          {readinessModalContent.level}
                        </span> Readiness Level
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowReadinessModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mt-2">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                      <h4 className="text-sm font-medium mb-2">Explanation</h4>
                      <p className="text-sm text-gray-700">{readinessModalContent.explanation}</p>
                    </div>
                    
                    <div className="p-4 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium mb-3">Readiness Level Criteria</h4>
                      <div className="space-y-3 text-xs">
                        <div className={`p-2 rounded-md ${readinessModalContent.level === 'Cloud-Native' ? 'bg-green-50 border border-green-100' : ''}`}>
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none rounded-full bg-green-100 text-green-800">Cloud-Native</span>
                            <span>75+ score in critical components and overall</span>
                          </div>
                          <p className="mt-1 ml-10 text-gray-600">Fully optimized for cloud environments with excellent containerization, auto-scaling, and high resilience.</p>
                        </div>
                        
                        <div className={`p-2 rounded-md ${readinessModalContent.level === 'Cloud-Ready' ? 'bg-yellow-50 border border-yellow-100' : ''}`}>
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none rounded-full bg-yellow-100 text-yellow-800">Cloud-Ready</span>
                            <span>60+ score in critical components and overall</span>
                          </div>
                          <p className="mt-1 ml-10 text-gray-600">Ready for cloud deployment with minimal changes. Good practices in containerization and configuration management.</p>
                        </div>
                        
                        <div className={`p-2 rounded-md ${readinessModalContent.level === 'Cloud-Friendly' ? 'bg-orange-50 border border-orange-100' : ''}`}>
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none rounded-full bg-orange-100 text-orange-800">Cloud-Friendly</span>
                            <span>40+ score in components</span>
                          </div>
                          <p className="mt-1 ml-10 text-gray-600">Can work in cloud environments but requires moderate modifications to architecture and practices.</p>
                        </div>
                        
                        <div className={`p-2 rounded-md ${readinessModalContent.level === 'Cloud-Challenged' ? 'bg-red-50 border border-red-100' : ''}`}>
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none rounded-full bg-red-100 text-red-800">Cloud-Challenged</span>
                            <span>Below 40 score</span>
                          </div>
                          <p className="mt-1 ml-10 text-gray-600">Significant architectural changes needed before suitable for cloud deployment.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wf-red sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={() => setShowReadinessModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
