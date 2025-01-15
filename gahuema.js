    const originalCanvas = document.getElementById('originalCanvas');
    const modifiedCanvas = document.getElementById('modifiedCanvas');
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const anchorHueInput = document.getElementById('anchorHue');
    const factorInput = document.getElementById('factor');
    const transformTypeSelect = document.getElementById('transformType');
    const processBtn = document.getElementById('processBtn');
    const saveBtn = document.getElementById('saveBtn');
	const originalPixelInfo = document.getElementById('originalPixelInfo');
const modifiedPixelInfo = document.getElementById('modifiedPixelInfo');

function getPixelInfo(canvas, x, y) {
  const ctx = canvas.getContext('2d');
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  const [h, s, l] = rgbToHsl(pixel[0], pixel[1], pixel[2]);
  return {
    hue: Math.round(h),
    saturation: Math.round(s),
    lightness: Math.round(l),
    pixel: pixel,
    x: x,
    y: y
  };
}

const polynomialControls = `
  <div class="input-group polynomial-controls" style="display: none;">
    <div class="formula-display">
      newHue = initialHue + (divider/hueDiff + distanceToMove + multiplier*hueDiff)
    </div>
    <div class="input-group">
      <label for="dividerFactor">Divider Factor:</label>
      <input type="number" id="dividerFactor" step="0.1" value="0">
    </div>
    <div class="input-group">
      <label for="distanceToMove">Distance to Move:</label>
      <input type="number" id="distanceToMove" step="0.1" value="0">
    </div>
    <div class="input-group">
      <label for="multiplierFactor">Multiplier Factor:</label>
      <input type="number" id="multiplierFactor" step="0.1" value="0.5">
    </div>
    <div class="input-group">
      <label for="preventCrossing">
        <input type="checkbox" id="preventCrossing" checked>
        Prevent Crossing Anchor Point
      </label>
    </div>
  </div>
`;

const powerControls = `
  <div class="input-group power-controls" style="display: none;">
    <div class="formula-display">
      newHue = initialHue + distanceToMove * hueDiff^power
    </div>
    <div class="input-group">
      <label for="powerDistance">Distance to Move:</label>
      <input type="number" id="powerDistance" step="0.1" value="1.0">
    </div>
    <div class="input-group">
      <label for="powerExponent">Power:</label>
      <input type="number" id="powerExponent" step="0.1" value="2.0">
    </div>
    <div class="input-group">
      <label for="preventPowerCrossing">
        <input type="checkbox" id="preventPowerCrossing" checked>
        Prevent Crossing Anchor Point
      </label>
    </div>
  </div>
`;

// Update the transform type change handler
document.getElementById('transformType').addEventListener('change', (e) => {
  const polynomialControls = document.querySelector('.polynomial-controls');
  const powerControls = document.querySelector('.power-controls');
  const basicControls = document.querySelector('.basic-controls');
  
  // Hide all controls first
  polynomialControls.style.display = 'none';
  powerControls.style.display = 'none';
  basicControls.style.display = 'none';
  
  // Show the appropriate controls
  switch(e.target.value) {
    case 'polynomial':
      polynomialControls.style.display = 'block';
      break;
    case 'power':
      powerControls.style.display = 'block';
      break;
    default:
      basicControls.style.display = 'block';
      break;
  }
});

function updateAnchorFromPixel(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));
  
  if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
    const pixelInfo = getPixelInfo(canvas, x, y);
    
    // Update anchor hue input and slider
    const hue = pixelInfo.hue;
    anchorHueInput.value = hue;
    hueSlider.value = hue;
    
    // Update color preview
    updateAnchorPreview(hue);
  }
}

// Initialize visibility based on default selection
const initialTransformType = document.getElementById('transformType').value;
document.querySelector('.polynomial-controls').style.display = 
  initialTransformType === 'polynomial' ? 'block' : 'none';
document.querySelector('.basic-controls').style.display = 
  initialTransformType === 'polynomial' ? 'none' : 'block';

// Update click event listeners for both canvases
originalCanvas.addEventListener('click', (e) => {
  updateAnchorFromPixel(originalCanvas, e);
  updatePixelInfo(e, originalCanvas, originalPixelInfo, modifiedCanvas, modifiedPixelInfo);
});

modifiedCanvas.addEventListener('click', (e) => {
  updateAnchorFromPixel(modifiedCanvas, e);
  updatePixelInfo(e, modifiedCanvas, modifiedPixelInfo, originalCanvas, originalPixelInfo);
});

function updatePixelInfo(e, sourceCanvas, sourceInfo, targetCanvas, targetInfo) {
  const rect = sourceCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * (sourceCanvas.width / rect.width));
  const y = Math.floor((e.clientY - rect.top) * (sourceCanvas.height / rect.height));
  
  if (x >= 0 && x < sourceCanvas.width && y >= 0 && y < sourceCanvas.height) {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');
    
    const sourcePixel = sourceCtx.getImageData(x, y, 1, 1).data;
    const targetPixel = targetCtx.getImageData(x, y, 1, 1).data;
    
    const [sourceH, sourceS, sourceL] = rgbToHsl(sourcePixel[0], sourcePixel[1], sourcePixel[2]);
    const [targetH, targetS, targetL] = rgbToHsl(targetPixel[0], targetPixel[1], targetPixel[2]);
    
    const hueDiff = normalizeAngle(targetH - sourceH);
    const normalizedDiff = hueDiff > 180 ? hueDiff - 360 : hueDiff;
    
sourceInfo.innerHTML = `
  <div class="color-swatch" style="background-color: rgb(${sourcePixel[0]}, ${sourcePixel[1]}, ${sourcePixel[2]})"></div>
  <div class="info-text">
    Position: (${x}, ${y})<br>
    H: ${Math.round(sourceH)}&#176; S: ${Math.round(sourceS)}% L: ${Math.round(sourceL)}%
  </div>
`;

targetInfo.innerHTML = `
  <div class="color-swatch" style="background-color: rgb(${targetPixel[0]}, ${targetPixel[1]}, ${targetPixel[2]})"></div>
  <div class="info-text">
    Position: (${x}, ${y})<br>
    H: ${Math.round(targetH)}&#176; S: ${Math.round(targetS)}% L: ${Math.round(targetL)}%<br>
    Hue Difference: ${Math.round(normalizedDiff)}&#176;
  </div>
`;
  }
}


// Insert the power controls after the transform type select
document.querySelector('.controls').insertAdjacentHTML('beforeend', powerControls);

// Add these event listeners after canvas setup
originalCanvas.addEventListener('mousemove', (e) => {
  updatePixelInfo(e, originalCanvas, originalPixelInfo, modifiedCanvas, modifiedPixelInfo);
});

modifiedCanvas.addEventListener('mousemove', (e) => {
  updatePixelInfo(e, modifiedCanvas, modifiedPixelInfo, originalCanvas, originalPixelInfo);
});

// Optional: Add click handlers if you want to "freeze" the info
originalCanvas.addEventListener('click', (e) => {
  updatePixelInfo(e, originalCanvas, originalPixelInfo, modifiedCanvas, modifiedPixelInfo);
});

modifiedCanvas.addEventListener('click', (e) => {
  updatePixelInfo(e, modifiedCanvas, modifiedPixelInfo, originalCanvas, originalPixelInfo);
});
    
    let originalImageData = null;
    
    // Save functionality
    saveBtn.addEventListener('click', () => {
      if (!modifiedCanvas.width) return;
      
      // Create a temporary link
      const link = document.createElement('a');
      link.download = 'gahuma-processed.png';
      link.href = modifiedCanvas.toDataURL('image/png');
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
    
    // Drag and drop handlers
    dropZone.addEventListener('click', () => imageInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
      }
    });
    
    // Convert RGB to HSL
    function rgbToHsl(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      
      return [h * 360, s * 100, l * 100];
    }
    
    // Convert HSL to RGB
    function hslToRgb(h, s, l) {
      h /= 360;
      s /= 100;
      l /= 100;
      
      let r, g, b;
      
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      
      return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
      ];
    }
    
    // Normalize angle to 0-360 range
    function normalizeAngle(angle) {
      angle = angle % 360;
      return angle < 0 ? angle + 360 : angle;
    }
    
 // Update the processImage function to include polynomial mode
function processImage() {
	
	
  if (!originalImageData) return;
  
  const anchorHue = parseFloat(anchorHueInput.value);
  const transformType = transformTypeSelect.value;
  
  // Draw original image data to modified canvas
  modifiedCanvas.width = originalImageData.width;
  modifiedCanvas.height = originalImageData.height;
  const ctx = modifiedCanvas.getContext('2d');
  ctx.putImageData(originalImageData, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, modifiedCanvas.width, modifiedCanvas.height);
  const data = imageData.data;
  
  // Get polynomial mode parameters if needed
  const dividerFactor = transformType === 'polynomial' ? parseFloat(document.getElementById('dividerFactor').value) : 0;
  const distanceToMove = transformType === 'polynomial' ? parseFloat(document.getElementById('distanceToMove').value) : 0;
  const multiplierFactor = transformType === 'polynomial' ? parseFloat(document.getElementById('multiplierFactor').value) : 0.5;
  const preventCrossing = transformType === 'polynomial' ? document.getElementById('preventCrossing').checked : false;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const [h, s, l] = rgbToHsl(r, g, b);
    
    let newHue;
	if (transformType === 'power') {
      // Get power mode parameters
      const distanceToMove = parseFloat(document.getElementById('powerDistance').value);
      const power = parseFloat(document.getElementById('powerExponent').value);
      const preventCrossing = document.getElementById('preventPowerCrossing').checked;
      
      // Calculate the shortest path difference
      const hueDiff1 = normalizeAngle(h - anchorHue); // Going clockwise
      const hueDiff2 = hueDiff1 > 180 ? hueDiff1 - 360 : hueDiff1; // Convert to -180 to 180 range
      
      // Use the smaller difference
      const hueDiff = Math.abs(hueDiff2) < Math.abs(hueDiff1) ? hueDiff2 : hueDiff1;
      
      // Calculate power transformation
      // Preserve the sign of hueDiff when applying power
      const sign = Math.sign(hueDiff);
      const powerTerm = sign * Math.pow(Math.abs(hueDiff), power);
      const totalMove = distanceToMove * powerTerm;
      
      // Check if movement would cross anchor point
      const wouldCross = preventCrossing && (
        (hueDiff > 0 && totalMove < 0) || // Moving counterclockwise past anchor
        (hueDiff < 0 && totalMove > 0) || // Moving clockwise past anchor
        Math.abs(totalMove) > Math.abs(hueDiff) // Moving beyond anchor
      );
      
      if (wouldCross) {
        newHue = anchorHue;
      } else {
        newHue = normalizeAngle(h + totalMove);
      }
    } else if (transformType === 'polynomial') {
      // Calculate the shortest path difference
      const hueDiff1 = normalizeAngle(h - anchorHue); // Going clockwise
      const hueDiff2 = hueDiff1 > 180 ? hueDiff1 - 360 : hueDiff1; // Convert to -180 to 180 range
      
      // Use the smaller difference
      const hueDiff = Math.abs(hueDiff2) < Math.abs(hueDiff1) ? hueDiff2 : hueDiff1;
      
      // Calculate polynomial sum
      // If hueDiff is 0, skip the division to avoid divide by zero
      const dividerTerm = hueDiff !== 0 ? dividerFactor / hueDiff : 0;
      const polynomialSum = dividerTerm + distanceToMove + (multiplierFactor * hueDiff);
      
      // Determine if the sum would cause crossing
      const wouldCross = preventCrossing && (
        (hueDiff > 0 && polynomialSum < 0) || // Moving counterclockwise past anchor
        (hueDiff < 0 && polynomialSum > 0) || // Moving clockwise past anchor
        Math.abs(polynomialSum) > Math.abs(hueDiff) // Moving beyond anchor
      );
      
      if (wouldCross) {
        newHue = anchorHue; // Set to anchor point if crossing would occur
      } else {
        newHue = normalizeAngle(h + polynomialSum);
      }
    } else if (transformType === 'multiply') {
      // Existing multiply mode code
      const hueDiff1 = normalizeAngle(h - anchorHue);
      const hueDiff2 = hueDiff1 > 180 ? hueDiff1 - 360 : hueDiff1;
      const finalDiff = Math.abs(hueDiff2) < Math.abs(hueDiff1) ? hueDiff2 : hueDiff1;
      const multipliedDiff = finalDiff * parseFloat(factor.value);
      newHue = normalizeAngle(anchorHue + multipliedDiff);
    } else {
      // Existing add mode code
      const hueDiff1 = normalizeAngle(anchorHue - h);
      const hueDiff2 = hueDiff1 > 180 ? hueDiff1 - 360 : hueDiff1;
      const shouldGoCounterclockwise = Math.abs(hueDiff2) < Math.abs(hueDiff1);
      newHue = normalizeAngle(h + (shouldGoCounterclockwise ? -parseFloat(factor.value) : parseFloat(factor.value)));
    }
    
    const [newR, newG, newB] = hslToRgb(newHue, s, l);
    
    data[i] = newR;
    data[i + 1] = newG;
    data[i + 2] = newB;
  }
  
  ctx.putImageData(imageData, 0, 0);
}
    // Handle image file loading
    function handleImageFile(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Set canvas dimensions
          originalCanvas.width = img.width;
          originalCanvas.height = img.height;
          modifiedCanvas.width = img.width;
          modifiedCanvas.height = img.height;
          
          // Draw and store original image
          const originalCtx = originalCanvas.getContext('2d');
          originalCtx.drawImage(img, 0, 0);
          originalImageData = originalCtx.getImageData(0, 0, img.width, img.height);
          
          // Draw initial modified image
          const modifiedCtx = modifiedCanvas.getContext('2d');
          modifiedCtx.drawImage(img, 0, 0);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    
    // Handle file input change
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImageFile(file);
      }
    });
    
    // Process button click handler
    processBtn.addEventListener('click', processImage);
  const hueSlider = document.getElementById('hueSlider');
    const anchorPreview = document.getElementById('anchorPreview');
    
    function updateAnchorPreview(hue) {
      anchorPreview.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    }
    
    // Sync number input with slider
    anchorHueInput.addEventListener('input', (e) => {
      const value = Math.min(360, Math.max(0, e.target.value));
      hueSlider.value = value;
      updateAnchorPreview(value);
    });
    
    // Sync slider with number input
    hueSlider.addEventListener('input', (e) => {
      anchorHueInput.value = e.target.value;
      updateAnchorPreview(e.target.value);
    });
    
    // Initialize color preview
    updateAnchorPreview(anchorHueInput.value);
    
