import { useState } from 'react';
import { EnhancedStepper, EnhancedButton } from '@repo/ui';
import { Step1JobDetails } from './step1-job-details';
import { Step2SelectResume } from './step2-select-resume';
import { Step3Analysis } from './step3-analysis';
import type { Job, AnalysisResult } from '@repo/shared-types';
import styles from '../routes/style/job.module.css';
import scrollStyles from '@repo/ui/scroll-bar.module.css';

const AUTOFILL_STEPS = ['Job Details', 'Select Resume', 'Analysis'];

export interface AutofillWizardProps {
  jobData?: Job | null;
  isEditing?: boolean;
  initialStep?: number;
  onComplete?: (jobId: string) => void;
}

export const AutofillWizard = ({
  jobData,
  isEditing = false,
  initialStep = 0,
  onComplete,
}: AutofillWizardProps) => {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [savedJobId, setSavedJobId] = useState<string | null>(jobData?.id || null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Step 2 selections
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  // Step 3 analysis
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSaveSuccess = (jobId: string) => {
    setSavedJobId(jobId);
  };

  const handleError = (error: string) => {
    setGlobalError(error);
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  // Initialize Step1JobDetails - call it as a function to get the returned object
  const step1 = Step1JobDetails({
    jobData: savedJobId ? ({ ...(jobData || {}), id: savedJobId } as Job) : jobData,
    isEditing: isEditing || !!savedJobId,
    onSaveSuccess: handleSaveSuccess,
    onError: handleError,
  });

  const handleSaveAndProceed = async () => {
    if (activeStep === 0) {
      const result = await step1.submit();
      if (result.success && result.jobId) {
        setSavedJobId(result.jobId);
        setActiveStep((prev) => prev + 1);
        setGlobalError(null);
      }
    } else if (activeStep === 1) {
      if (!selectedPersonaId || !selectedResumeId) {
        setGlobalError('Please select a persona and a resume to proceed.');
        return;
      }

      // Trigger analysis
      setIsAnalyzing(true);
      setGlobalError(null);
      setActiveStep((prev) => prev + 1);

      chrome.runtime.sendMessage(
        { action: 'ANALYZE_RESUME', payload: { jobId: savedJobId, resumeId: selectedResumeId } },
        (response: { success: boolean; data?: AnalysisResult; error?: string }) => {
          setIsAnalyzing(false);
          if (response?.success && response.data) {
            setAnalysisResult(response.data);
          } else {
            setGlobalError(response?.error ?? 'Analysis failed. Please try again.');
          }
        }
      );
    }
  };

  const renderStep2Content = () => (
    <Step2SelectResume
      savedJobId={savedJobId}
      selectedPersonaId={selectedPersonaId}
      selectedResumeId={selectedResumeId}
      onChange={(personaId, resumeId) => {
        setSelectedPersonaId(personaId);
        setSelectedResumeId(resumeId);
        setGlobalError(null);
      }}
    />
  );

  const renderStep3Content = () => (
    <Step3Analysis result={analysisResult} isLoading={isAnalyzing} />
  );

  return (
    <div className={styles.container}>
      <div className={styles.stepperContainer}>
        <EnhancedStepper steps={AUTOFILL_STEPS} activeStep={activeStep} testId="autofill-stepper" />
      </div>

      <div className={styles.formContainer}>
        <div className={`${styles.scrollArea} ${scrollStyles.scrollbarVerticalContainer}`}>
          {activeStep === 0 && step1.renderForm()}
          {activeStep === 1 && renderStep2Content()}
          {activeStep === 2 && renderStep3Content()}
        </div>

        {(globalError || step1.error) && (
          <div className={styles.error}>{globalError || step1.error}</div>
        )}

        <div className={styles.buttonGroup}>
          <div className={styles.autofillButtons}>
            <EnhancedButton
              label="Back"
              colorTheme="secondary"
              onClick={handleBack}
              disabled={step1.loading || isAnalyzing || activeStep === 0}
            />
            {activeStep < AUTOFILL_STEPS.length - 1 ? (
              <EnhancedButton
                label={activeStep === 0 ? 'Save and Proceed' : 'Analyze'}
                colorTheme="primary"
                onClick={handleSaveAndProceed}
                disabled={
                  activeStep === 0 ? step1.loading : !selectedPersonaId || !selectedResumeId
                }
                customProps={{ props: { sx: { width: 'fit-content', maxWidth: 'fit-content' } } }}
              />
            ) : (
              <EnhancedButton
                label="Complete"
                colorTheme="primary"
                onClick={() => savedJobId && onComplete?.(savedJobId)}
                disabled={!savedJobId || isAnalyzing}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutofillWizard;
