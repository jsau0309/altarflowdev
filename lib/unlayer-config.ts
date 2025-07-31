import type { UnlayerOptions } from "react-email-editor";

export const getUnlayerConfig = (token: string | null): UnlayerOptions => {
  const config: UnlayerOptions = {
    displayMode: "email",
    appearance: {
      theme: "light",
    },
    features: {
      textEditor: {
        tables: true,
        emojis: true,
      },
      preheaderText: false,
      stockImages: {
        enabled: true,
        safeSearch: true,
        defaultSearchTerm: "church",
      },
    },
    tools: {
      image: {
        enabled: true,
        properties: {
          src: {
            value: {
              url: "",
              autoWidth: true,
            },
          },
        },
      },
    },
    customCSS: [
      `
      /* Hide Unlayer branding in free mode */
      .blockbuilder-branding { display: none !important; }
      `,
    ],
    customJS: [
      // Custom image upload handler
      `
      (function() {
        console.log('Initializing custom image upload handler...');
        
        // Function to register the callback
        function registerImageUpload() {
          if (typeof unlayer === 'undefined') {
            console.log('Waiting for Unlayer...');
            setTimeout(registerImageUpload, 100);
            return;
          }
          
          // Register custom image upload handler
          unlayer.registerCallback('image', function(file, done) {
            console.log('Custom upload handler triggered', file);
            
            const formData = new FormData();
            formData.append('file', file.attachments[0]);
            
            // Show upload progress
            done({ progress: 25 });
            
            fetch('/api/communication/upload-image', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ${token}'
              },
              body: formData
            })
            .then(response => {
              done({ progress: 75 });
              if (!response.ok) {
                throw new Error('Upload failed with status: ' + response.status);
              }
              return response.json();
            })
            .then(data => {
              console.log('Upload response:', data);
              if (data.url) {
                done({ progress: 100, url: data.url });
              } else {
                done({ progress: 0, error: data.error || 'Failed to upload image' });
              }
            })
            .catch(error => {
              console.error('Upload error:', error);
              done({ progress: 0, error: error.message || 'Failed to upload image' });
            });
          });
          
          console.log('Custom image upload handler registered successfully');
        }
        
        // Start registration process
        registerImageUpload();
      })();
      `,
    ],
  };

  // Only add projectId if it exists
  if (process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID) {
    config.projectId = parseInt(process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID);
  }

  return config;
};