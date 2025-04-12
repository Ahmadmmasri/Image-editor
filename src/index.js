import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Button, InputGroup, Icon } from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';
import { createStore } from 'polotno/model/store';


// Create the store
const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});

const page = store.addPage();

// Helper to get image dimensions for proper sizing before adding to canvas
const getImageDimensions = (dataUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    img.src = dataUrl;
  });
};

// Create a persistent uploads manager - a singleton object to keep state between tab changes
const uploadsManager = {
  uploads: [],
  listeners: [],

  getUploads() {
    return this.uploads;
  },

  addUpload(upload) {
    this.uploads = [...this.uploads, upload];
    this.notifyListeners();
  },

  deleteUpload(id) {
    this.uploads = this.uploads.filter(upload => upload.id !== id);
    this.notifyListeners();
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.uploads));
  }
};

// Create a custom upload section component
const CustomUploadSection = ({ store }) => {
  // Use state that's synced with our persistent manager
  const [uploads, setUploads] = useState(uploadsManager.getUploads());
  
  // Subscribe to changes
  React.useEffect(() => {
    const unsubscribe = uploadsManager.subscribe(newUploads => {
      setUploads(newUploads);
    });
    return unsubscribe;
  }, []);
  
  // Function to handle file upload
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    
    // Create array from FileList and process each file
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        
        // Add to uploads via the manager
        uploadsManager.addUpload({
          id: Date.now() + Math.random(), 
          name: file.name, 
          url: dataUrl
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Function to add image to canvas with proper dimensions
  const addImageToCanvas = async (imageUrl) => {
    try {
      // Get actual image dimensions
      const dimensions = await getImageDimensions(imageUrl);
      
      // Scale down if the image is too large
      let width = dimensions.width;
      let height = dimensions.height;
      
      // Max dimensions for canvas (adjust as needed)
      const maxWidth = 600;
      const maxHeight = 400;
      
      // Scale down proportionally if needed
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      // Add element to canvas with proper dimensions
      const element = store.activePage.addElement({
        type: 'image',
        src: imageUrl,
        width,
        height,
        // These properties should be supported in all Polotno versions
        draggable: true,
        resizable: true,
        alwaysOnTop: false
      });
      
      // Select the added element to show handles for resizing
      store.selectElements([element]);
    } catch (error) {
      console.error('Error adding image to canvas:', error);
    }
  };
  
  // Function to delete uploaded image
  const deleteUpload = (id, e) => {
    e.stopPropagation(); // Prevent triggering the parent click (adding to canvas)
    uploadsManager.deleteUpload(id);
  };
  
  return (
    <div style={{ padding: '15px' }}>
      <h3>Upload your assets</h3>
      
      <label htmlFor="file-upload" style={{
        display: 'block',
        padding: '10px',
        textAlign: 'center',
        cursor: 'pointer',
        border: '1px dashed #ccc',
        borderRadius: '4px',
        marginBottom: '15px'
      }}>
        <Icon icon="plus" /> Add file
        <input 
          id="file-upload" 
          type="file" 
          accept="image/*" 
          multiple 
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </label>
      
      {/* Grid layout for uploaded images - 3 per row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
      }}>
        {uploads.map(upload => (
          <div 
            key={upload.id} 
            style={{
              position: 'relative',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid #eee',
              aspectRatio: '1/1', // Square aspect ratio for consistent grid
            }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: '#f5f5f5',
            }} onClick={() => addImageToCanvas(upload.url)}>
              <img 
                src={upload.url} 
                alt={upload.name}
                style={{ 
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
            <Button
              icon="trash"
              intent="danger"
              minimal
              small
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                opacity: 0.8,
                backgroundColor: 'rgba(255,255,255,0.7)',
                boxShadow: '0 0 3px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => deleteUpload(upload.id, e)}
            />
          </div>
        ))}
      </div>
      
      {uploads.length === 0 && (
        <div style={{ textAlign: 'center', color: '#888', margin: '20px 0' }}>
          No uploads yet
        </div>
      )}
    </div>
  );
};

// Create our custom Upload section definition
const CustomUploadSectionDefinition = {
  name: 'upload',
  Tab: (props) => (
      <Button 
        minimal={!props.active} 
        onClick={props.onClick}
        style={{paddingBlock: '16px'}}
      >
        <span style={{display : 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontSize: "12px", gap: '5px'}}>
          <svg data-icon="cloud-upload" height="16" role="img" viewBox="0 0 16 16" width="16"><path d="M8.71 7.29C8.53 7.11 8.28 7 8 7s-.53.11-.71.29l-3 3a1.003 1.003 0 001.42 1.42L7 10.41V15c0 .55.45 1 1 1s1-.45 1-1v-4.59l1.29 1.29c.18.19.43.3.71.3a1.003 1.003 0 00.71-1.71l-3-3zM12 4c-.03 0-.07 0-.1.01A5 5 0 002 5c0 .11.01.22.02.33a3.495 3.495 0 00.07 6.37c-.05-.23-.09-.46-.09-.7 0-.83.34-1.58.88-2.12l3-3a2.993 2.993 0 014.24 0l3 3c.54.54.88 1.29.88 2.12 0 .16-.02.32-.05.47C15.17 10.78 16 9.5 16 8c0-2.21-1.79-4-4-4z" fill-rule="evenodd"></path></svg>
          Uploads
        </span>
      </Button>
  ),
  Panel: CustomUploadSection
};

// Custom toolbar
const CustomToolbar = ({ store }) => {
  const [imageName, setImageName] = useState('my-design');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!imageName.trim()) {
      alert('Please enter an image name');
      return;
    }
    
    setIsDownloading(true);
    try {
      const dataUrl = await store.toDataURL();
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${imageName.trim()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <div 
    >
      <div style={{ display: 'flex', gap: '10px', flexDirection: 'column',width: '90%'}}>
        <Toolbar store={store} downloadButtonEnabled={false} />
        <div style={{ display: 'flex', gap: '5px', marginInlineStart: '10px'}}>
          <InputGroup
            placeholder="Enter image name"
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
            style={{ width: '300px' }}
          />
          <Button
          icon="download"
          intent="primary"
          onClick={handleDownload}
          loading={isDownloading}
          disabled={isDownloading}
        >
          </Button>
          <Button
            icon="link"
            intent="primary"
            onClick={() => {
              const sheetUrl = `https://docs.google.com/spreadsheets/u/0/`;
              window.open(sheetUrl, '_blank');
            }}
          >
          </Button>
        </div>
      </div>
      <br/>
    </div>
  );
};

// Add help text component to show instructions for resizing
const ResizingInstructions = () => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '60px',
      left: '10px',
      background: 'rgba(255, 255, 255, 0.8)',
      padding: '10px',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 5px 0' }}>Resizing Tips:</h4>
      <ul style={{ margin: '0', paddingLeft: '20px' }}>
        <li>Select an image to see resize handles</li>
        <li>Drag corners to resize proportionally</li>
        <li>Hold Shift while resizing for free scaling</li>
        <li>Click an image to select it first</li>
      </ul>
    </div>
  );
};

const App = ({ store }) => {
  // Display instructions about resizing
  const [showHelp, setShowHelp] = useState(true);
  
  // Auto-hide help after 10 seconds
  React.useEffect(() => {
    if (showHelp) {
      const timer = setTimeout(() => {
        setShowHelp(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showHelp]);

  // Filter out the sections we want to hide
  const filteredSections = DEFAULT_SECTIONS.filter(section => {
    // Remove Templates, Text, Elements, Background, and Photos sections
    return !['templates', 'text', 'elements', 'background', 'photos'].includes(section.name);
  });
  
  // Replace the upload section with our custom one
  const customSections = filteredSections.map(section => {
    if (section.name === 'upload') {
      return CustomUploadSectionDefinition;
    }
    return section;
  });

  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} sections={customSections} />
      </SidePanelWrap>
      <WorkspaceWrap>
        <CustomToolbar store={store} />
        <Workspace store={store} />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} />
        {showHelp && <ResizingInstructions />}
        <div style={{ position: 'absolute', bottom: '0px', right: '10px',width: '170px', height: '25px', background: '#e8e8e8', borderRadius: '4px', zIndex: 1000 }}></div>
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);