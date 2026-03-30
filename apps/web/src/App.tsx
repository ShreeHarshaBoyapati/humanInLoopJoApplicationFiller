import { useEffect, useState } from 'react';
import styles from './App.module.css';
import { EnhancedFieldLabel as FieldLabel } from '@repo/ui/field-label.tsx';
import { EnhancedTextField as TextField } from '@repo/ui/text-field.tsx';
import { EnhancedButton as Button } from '@repo/ui/button.tsx';
import { EnhancedChip as Chip } from '@repo/ui/chip.tsx';
import { EnhancedSelectDropdown as SelectDropdown } from '@repo/ui/select-dropdown.tsx';
import { EnhancedTextInputArea as TextInputArea } from '@repo/ui/text-input-area.tsx';
import { FileUploader } from '@repo/ui/file-uploader.tsx';
import { EnhancedStepper } from '@repo/ui/stepper.tsx';
import scrollbarStyles from '@repo/ui/scroll-bar.module.css';

// API URL: In production, frontend and backend are on same origin
// In development, backend runs on port 3001
const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiResponse {
  message: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
}

function App() {
  const [apiMessage, setApiMessage] = useState<string>('Loading...');
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [selectedValue, setSelectedValue] = useState<string | number | readonly string[]>(
    'option1'
  );

  const dropdownOptions = [
    { dataId: 'opt-1', value: 'option1', label: 'Option 1' },
    { dataId: 'opt-2', value: 'option2', label: 'Option 2' },
    { dataId: 'opt-3', value: 'option3', label: 'Option 3' },
  ];

  // Fetch data from backend on component mount
  useEffect(() => {
    // Check backend health
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data: HealthResponse) => {
        setBackendStatus(`✅ Backend is ${data.status}`);
      })
      .catch(() => {
        setBackendStatus('❌ Backend is offline');
      });

    // Fetch hello message
    fetch(`${API_URL}/api/hello`)
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        setApiMessage(data.message);
      })
      .catch(() => {
        setApiMessage('Failed to connect to API');
      });
  }, []);

  return (
    <div className={`${styles.container} ${scrollbarStyles.scrollbarVerticalContainer}`}>
      <header className={styles.header}>
        <h1>Field Label Design System Gallery</h1>
        <div className={styles.card}>
          <p>
            <strong>Backend Status:</strong> {backendStatus} | <strong>API Message:</strong>{' '}
            {apiMessage}
          </p>
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic Label Variants</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Default (Bold)</span>
            <FieldLabel label="Username" />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Thin Font Weight</span>
            <FieldLabel label="Email Address" thin={true} />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Large Font Size</span>
            <FieldLabel label="Password" fontSize="12px" lineHeight="20px" />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Labels with Tooltips</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Icon Tooltip Next to Label</span>
            <FieldLabel
              label="API Key"
              showTooltip={true}
              tooltipText="Your secret key for authentication. Keep this private."
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Label as Tooltip Trigger (Truncation)</span>
            <div
              style={{
                width: '150px',
                border: '1px solid var(--black-500)',
                padding: '8px',
              }}
            >
              <FieldLabel
                label="Extremely long label that should truncate and show a tooltip on hover to reveal the full text"
                labelWithTooltip={true}
                tooltipText="Extremely long label that should truncate and show a tooltip on hover to reveal the full text"
              />
            </div>
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Tooltip Trigger Placement Bottom</span>
            <div
              style={{
                width: '150px',
                border: '1px solid var(--black-500)',
                padding: '8px',
              }}
            >
              <FieldLabel
                label="Another long label testing bottom placement"
                labelWithTooltip={true}
                placement="bottom"
                tooltipText="Another long label testing bottom placement"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Text Field Variants & States</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Default Variant</span>
            <TextField
              label="Username"
              placeholder="Enter username"
              id="getId"
              testId="getIdTest"
              customProps={{
                props: {
                  multiline: true,
                  rows: 6,
                  sx: {
                    '& .MuiOutlinedInput-root': {
                      height: 'auto',
                      maxHeight: 'none',
                      alignItems: 'flex-start',
                    },
                  },
                },
              }}
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled Variant</span>
            <TextField
              label="Email Address"
              placeholder="Enter email"
              variant="disabled"
              value="disabled@example.com"
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Error Variant</span>
            <TextField
              label="Password"
              placeholder="Enter password"
              variant="error"
              value="123"
              helperText="Password must be at least 8 characters"
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With Tooltip</span>
            <TextField
              label="API Key"
              placeholder="Enter API Key"
              showTooltip={true}
              tooltipText="Find this in your developer dashboard"
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With Start Icon</span>
            <TextField
              label="Search"
              placeholder="Search..."
              startIcon={<span style={{ fontSize: '12px' }}>🔍</span>}
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Small Size</span>
            <TextField label="Small Input" placeholder="Small size..." size="small" />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Text Input Area Variants & States</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Default Variant</span>
            <TextInputArea
              label="Description"
              placeholder="Enter comprehensive description"
              id="descId"
              testId="descIdTest"
              minRows={4}
              maxRows={8}
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled Variant</span>
            <TextInputArea
              label="Comments"
              placeholder="Enter your comments"
              variant="disabled"
              value="This input is completely disabled and cannot be modified."
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Error Variant</span>
            <TextInputArea
              label="Bio"
              placeholder="Enter biography"
              variant="error"
              value="I like to write short bios."
              helperText="Biography must be at least 500 characters"
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With Tooltip</span>
            <TextInputArea
              label="Custom Instructions"
              placeholder="Add extra instructions here"
              showTooltip={true}
              tooltipText="Specify additional guidelines."
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With Start Icon</span>
            <TextInputArea label="Search Description" placeholder="Search..." />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Small Size</span>
            <TextInputArea label="Small Input Area" placeholder="Small size..." size="small" />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Select Dropdowns</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Default</span>
            <SelectDropdown
              id="select-1"
              testId="select-1"
              label="Choose an Option"
              options={dropdownOptions}
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With Tooltip & Supporting Text</span>
            <SelectDropdown
              id="select-2"
              testId="select-2"
              label="Select Item"
              showTooltip={true}
              tooltipText="Please select one of the available items from the list."
              showSupportingText={true}
              supportingText="This is some supporting help text."
              options={dropdownOptions}
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Error State</span>
            <SelectDropdown
              id="select-3"
              testId="select-3"
              label="Required Field"
              error={true}
              showErrorMsg={true}
              errorText="This selection is required."
              options={dropdownOptions}
              value={''}
              displayEmpty
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled</span>
            <SelectDropdown
              id="select-4"
              testId="select-4"
              label="Disabled Dropdown"
              disabled={true}
              options={dropdownOptions}
              value={'option2'}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Text Field HTML Types</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Type: Text</span>
            <TextField label="Full Name" type="text" placeholder="John Doe" />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Type: Password</span>
            <TextField
              label="Password"
              type="password"
              placeholder="Enter password"
              value="secret123"
            />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Type: Email</span>
            <TextField label="Email Address" type="email" placeholder="john@example.com" />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Type: Number</span>
            <TextField label="Age" type="number" placeholder="Enter your age" />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Type: Tel</span>
            <TextField label="Phone Number" type="tel" placeholder="+1 (555) 000-0000" />
          </div>

          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Type: URL</span>
            <TextField label="Website" type="url" placeholder="https://example.com" />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Buttons - Primary</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Small</span>
            <Button label="Primary Small" colorTheme="primary" size="small" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Medium (Default)</span>
            <Button
              label="Primary Medium"
              colorTheme="primary"
              size="medium"
              testId="buttonTestId"
              id="testId"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Large</span>
            <Button label="Primary Large" colorTheme="primary" size="large" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled</span>
            <Button label="Primary Disabled" colorTheme="primary" disabled />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With Start Icon</span>
            <Button
              label="Start Icon"
              colorTheme="primary"
              startIcon={<span style={{ fontSize: '16px' }}>⭐</span>}
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With End Icon</span>
            <Button
              label="End Icon"
              colorTheme="primary"
              endIcon={<span style={{ fontSize: '16px' }}>🚀</span>}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Buttons - Secondary</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Small</span>
            <Button label="Secondary Small" colorTheme="secondary" size="small" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Medium</span>
            <Button label="Secondary Medium" colorTheme="secondary" size="medium" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Large</span>
            <Button label="Secondary Large" colorTheme="secondary" size="large" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled</span>
            <Button label="Secondary Disabled" colorTheme="secondary" disabled />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Buttons - Tertiary</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Small</span>
            <Button label="Tertiary Small" colorTheme="tertiary" size="small" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Medium</span>
            <Button label="Tertiary Medium" colorTheme="tertiary" size="medium" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Large</span>
            <Button label="Tertiary Large" colorTheme="tertiary" size="large" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled</span>
            <Button label="Tertiary Disabled" colorTheme="tertiary" disabled />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Buttons - Negative Secondary</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Small</span>
            <Button label="Negative Small" colorTheme="negativeSecondary" size="small" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Medium</span>
            <Button label="Negative Medium" colorTheme="negativeSecondary" size="medium" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Large</span>
            <Button label="Negative Large" colorTheme="negativeSecondary" size="large" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled</span>
            <Button label="Negative Disabled" colorTheme="negativeSecondary" disabled />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Buttons - Hyperlink Tertiary</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Small</span>
            <Button label="Hyperlink Small" colorTheme="hyperLinkTertiary" size="small" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Medium</span>
            <Button label="Hyperlink Medium" colorTheme="hyperLinkTertiary" size="medium" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Large</span>
            <Button label="Hyperlink Large" colorTheme="hyperLinkTertiary" size="large" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled</span>
            <Button label="Hyperlink Disabled" colorTheme="hyperLinkTertiary" disabled />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Buttons - View More</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Default</span>
            <Button label="View More" colorTheme="text" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With End Icon</span>
            <Button
              label="View More"
              colorTheme="text"
              endIcon={<span style={{ fontSize: '16px' }}>▼</span>}
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled</span>
            <Button label="View More" colorTheme="text" disabled />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Chips</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Basic (No Delete)</span>
            <Chip label="Basic Chip" showDeleteIcon={false} id="check-1" testId="check-1" />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Deletable</span>
            <Chip
              label="Deletable Chip"
              showDeleteIcon={true}
              onDelete={() => console.log('Delete clicked')}
              id="check-2"
              testId="check-2"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Custom Delete Icon Color</span>
            <Chip
              label="Custom Icon"
              showDeleteIcon={true}
              onDelete={() => console.log('Delete clicked')}
              customProps={{ deleteIconProps: { fill: 'red' } }}
              id="check-3"
              testId="check-3"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled</span>
            <Chip
              label="Disabled Chip"
              showDeleteIcon={true}
              customProps={{ chipProps: { disabled: true } }}
              id="check-4"
              testId="check-4"
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>File Uploader</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Default (PDF, DOC, DOCX)</span>
            <FileUploader
              onFilesSelected={(files) => console.log('Selected files:', files)}
              testId="file-uploader-default"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Custom Formats (Images)</span>
            <FileUploader
              acceptedFormats={['.jpg', '.jpeg', '.png', '.gif']}
              maxFiles={3}
              maxSizeMB={10}
              onFilesSelected={(files) => console.log('Selected images:', files)}
              testId="file-uploader-images"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Multiple Files</span>
            <FileUploader
              acceptedFormats={['.pdf', '.doc', '.docx']}
              maxFiles={5}
              onFilesSelected={(files) => console.log('Selected multiple:', files)}
              testId="file-uploader-multiple"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled State</span>
            <FileUploader disabled={true} testId="file-uploader-disabled" />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Stepper</h2>
        <div className={styles.grid}>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Basic Stepper (Active Step 1)</span>
            <EnhancedStepper
              steps={['Select campaign settings', 'Create an ad group', 'Create an ad']}
              activeStep={1}
              testId="stepper-basic"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With Optional Step</span>
            <EnhancedStepper
              steps={['Select campaign settings', 'Create an ad group', 'Create an ad']}
              activeStep={0}
              optionalSteps={[1]}
              testId="stepper-optional"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Completed Steps (Active Step 2)</span>
            <EnhancedStepper
              steps={['Select campaign settings', 'Create an ad group', 'Create an ad']}
              activeStep={2}
              testId="stepper-completed"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>With Error Step</span>
            <EnhancedStepper
              steps={['Select campaign settings', 'Create an ad group', 'Create an ad']}
              activeStep={1}
              errorSteps={[1]}
              testId="stepper-error"
            />
          </div>
          <div className={styles.variantContainer}>
            <span className={styles.variantLabel}>Disabled State</span>
            <EnhancedStepper
              steps={['Step 1', 'Step 2', 'Step 3']}
              activeStep={1}
              disabled={true}
              testId="stepper-disabled"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
