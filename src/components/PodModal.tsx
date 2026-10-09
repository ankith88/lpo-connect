import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Trash2, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText, 
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Eye,
  Maximize2
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { storage, db } from '../firebase/config';
import { useLpo } from '../context/LpoContext';

export interface PodPhoto {
  id: string;
  url: string;
  storagePath?: string;
  name: string;
  size?: number;
  uploadedAt: string;
  uploadedByUid: string;
  uploadedByName: string;
  uploadedByRole: string;
}

interface PodModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  isAdmin: boolean;
  mode?: 'upload' | 'view';
  initialPhotoIndex?: number;
  onSuccess?: (updatedJob: any) => void;
  collectionName?: 'jobs' | 'requests';
}

const PodModal: React.FC<PodModalProps> = ({
  isOpen,
  onClose,
  job,
  isAdmin,
  mode = 'view',
  initialPhotoIndex = 0,
  onSuccess,
  collectionName = 'jobs'
}) => {
  const { userData, user } = useLpo();
  const [activeTab, setActiveTab] = useState<'view' | 'upload'>(mode === 'upload' && isAdmin ? 'upload' : 'view');
  
  // Existing Photos State
  const [existingPhotos, setExistingPhotos] = useState<PodPhoto[]>([]);
  const [podNotes, setPodNotes] = useState<string>('');
  
  // Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [newPodNotes, setNewPodNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Lightbox / Image Viewer State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(initialPhotoIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (job) {
      const photos = (job.podPhotos || []) as PodPhoto[];
      setExistingPhotos(photos);
      setPodNotes(job.podNotes || '');
      setNewPodNotes(job.podNotes || '');
      
      const safeIndex = Math.min(Math.max(0, initialPhotoIndex), Math.max(0, photos.length - 1));
      setSelectedPhotoIndex(safeIndex);
      setActiveTab(mode === 'upload' && isAdmin ? 'upload' : 'view');
      
      // Reset view adjustments
      setZoomLevel(1);
      setRotation(0);
      setErrorMessage(null);
      setSuccessMessage(null);
      setSelectedFiles([]);
      setFilePreviews([]);
    }
  }, [job, isOpen, mode, isAdmin, initialPhotoIndex]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      filePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  if (!isOpen || !job) return null;

  const currentPhoto = existingPhotos[selectedPhotoIndex];

  // File Selection Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validImageFiles = filesArray.filter(f => f.type.startsWith('image/'));
      
      if (validImageFiles.length !== filesArray.length) {
        setErrorMessage("Only image files (JPEG, PNG, WEBP, etc.) are allowed.");
      } else {
        setErrorMessage(null);
      }

      const newPreviews = validImageFiles.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...validImageFiles]);
      setFilePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Upload handler to Firebase Storage & Firestore
  const handleUploadPod = async () => {
    if (selectedFiles.length === 0 && !newPodNotes) {
      setErrorMessage("Please select at least one photo or enter POD notes.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(10);
    setUploadStatusText("Preparing files for upload...");

    try {
      const uploadedPhotosList: PodPhoto[] = [];
      const totalFiles = selectedFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        setUploadStatusText(`Uploading photo ${i + 1} of ${totalFiles}...`);
        
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `pod_photos/${job.id}/${timestamp}_${sanitizedName}`;
        const storageReference = ref(storage, storagePath);

        // Upload to Firebase Storage
        const uploadResult = await uploadBytes(storageReference, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        const newPhoto: PodPhoto = {
          id: `${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
          url: downloadUrl,
          storagePath: storagePath,
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedByUid: user?.uid || userData?.uid || 'admin',
          uploadedByName: userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : (userData?.email || 'Admin'),
          uploadedByRole: userData?.role || 'admin'
        };

        uploadedPhotosList.push(newPhoto);
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 85));
      }

      setUploadStatusText("Saving details to database...");
      
      const combinedPhotos = [...existingPhotos, ...uploadedPhotosList];
      const targetCollection = collectionName || 'jobs';
      
      const updatePayload: any = {
        podPhotos: combinedPhotos,
        podNotes: newPodNotes.trim(),
        podUpdatedAt: new Date().toISOString(),
        hasPod: combinedPhotos.length > 0
      };

      // Update in current target collection
      const docRef = doc(db, targetCollection, job.id);
      await updateDoc(docRef, updatePayload);

      // If this is a job with an originalRequestId, also update the request doc for full sync
      if (job.originalRequestId && targetCollection === 'jobs') {
        try {
          const reqRef = doc(db, 'requests', job.originalRequestId);
          const reqSnap = await getDoc(reqRef);
          if (reqSnap.exists()) {
            await updateDoc(reqRef, updatePayload);
          }
        } catch (e) {
          console.warn("Could not sync POD with linked request doc:", e);
        }
      }

      setExistingPhotos(combinedPhotos);
      setPodNotes(newPodNotes.trim());
      setSelectedFiles([]);
      setFilePreviews([]);
      setUploadProgress(100);
      setSuccessMessage(`Successfully uploaded ${uploadedPhotosList.length} POD ${uploadedPhotosList.length === 1 ? 'photo' : 'photos'}!`);
      
      const updatedJob = { ...job, ...updatePayload };
      if (onSuccess) {
        onSuccess(updatedJob);
      }

      setTimeout(() => {
        setIsUploading(false);
        setActiveTab('view');
        setSelectedPhotoIndex(combinedPhotos.length - 1);
        setSuccessMessage(null);
      }, 1000);

    } catch (err: any) {
      console.error("Error uploading POD:", err);
      setErrorMessage(err.message || "Failed to upload Proof of Delivery. Please try again.");
      setIsUploading(false);
    }
  };

  // Delete a POD photo
  const handleDeletePhoto = async (photo: PodPhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    
    if (!window.confirm(`Are you sure you want to delete this Proof of Delivery photo (${photo.name})?`)) {
      return;
    }

    setDeletingPhotoId(photo.id);
    try {
      // 1. Delete from Firebase Storage if storagePath is available
      if (photo.storagePath) {
        try {
          const storageReference = ref(storage, photo.storagePath);
          await deleteObject(storageReference);
        } catch (storageErr) {
          console.warn("Storage deletion warning (file might already be deleted):", storageErr);
        }
      }

      // 2. Remove from Firestore
      const updatedPhotos = existingPhotos.filter(p => p.id !== photo.id);
      const targetCollection = collectionName || 'jobs';
      
      const updatePayload: any = {
        podPhotos: updatedPhotos,
        podUpdatedAt: new Date().toISOString(),
        hasPod: updatedPhotos.length > 0
      };

      await updateDoc(doc(db, targetCollection, job.id), updatePayload);

      // Also sync linked request doc if applicable
      if (job.originalRequestId && targetCollection === 'jobs') {
        try {
          const reqRef = doc(db, 'requests', job.originalRequestId);
          const reqSnap = await getDoc(reqRef);
          if (reqSnap.exists()) {
            await updateDoc(reqRef, updatePayload);
          }
        } catch (e) {
          console.warn("Linked request sync warning:", e);
        }
      }

      setExistingPhotos(updatedPhotos);
      const newIndex = Math.max(0, Math.min(selectedPhotoIndex, updatedPhotos.length - 1));
      setSelectedPhotoIndex(newIndex);
      
      const updatedJob = { ...job, ...updatePayload };
      if (onSuccess) {
        onSuccess(updatedJob);
      }

    } catch (err: any) {
      console.error("Error deleting POD photo:", err);
      alert("Failed to delete photo. Please try again.");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Save Notes Only
  const handleSaveNotesOnly = async () => {
    if (newPodNotes === podNotes) return;
    try {
      setIsUploading(true);
      const targetCollection = collectionName || 'jobs';
      await updateDoc(doc(db, targetCollection, job.id), {
        podNotes: newPodNotes.trim(),
        podUpdatedAt: new Date().toISOString()
      });
      setPodNotes(newPodNotes.trim());
      setSuccessMessage("POD notes updated successfully!");
      if (onSuccess) {
        onSuccess({ ...job, podNotes: newPodNotes.trim() });
      }
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      console.error("Error updating notes:", err);
      setErrorMessage("Failed to update POD notes.");
    } finally {
      setIsUploading(false);
    }
  };

  // Lightbox Navigation
  const handlePrevPhoto = () => {
    if (existingPhotos.length === 0) return;
    setSelectedPhotoIndex(prev => (prev === 0 ? existingPhotos.length - 1 : prev - 1));
    setZoomLevel(1);
    setRotation(0);
  };

  const handleNextPhoto = () => {
    if (existingPhotos.length === 0) return;
    setSelectedPhotoIndex(prev => (prev === existingPhotos.length - 1 ? 0 : prev + 1));
    setZoomLevel(1);
    setRotation(0);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Unknown date';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="pod-modal-overlay active" onClick={onClose}>
      <div 
        className="pod-modal-card glass-card fade-in" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: activeTab === 'view' && existingPhotos.length > 0 ? '900px' : '650px' }}
      >
        {/* Modal Header */}
        <div className="pod-modal-header">
          <div className="pod-header-info">
            <div className="pod-icon-wrap">
              <Camera size={22} className="pod-primary-icon" />
            </div>
            <div>
              <div className="pod-title-row">
                <h2>Proof of Delivery (POD)</h2>
                <span className={`pod-status-chip ${existingPhotos.length > 0 ? 'verified' : 'pending'}`}>
                  {existingPhotos.length > 0 ? (
                    <>
                      <CheckCircle2 size={12} />
                      <span>{existingPhotos.length} {existingPhotos.length === 1 ? 'Photo Attached' : 'Photos Attached'}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={12} />
                      <span>No Photos Yet</span>
                    </>
                  )}
                </span>
              </div>
              <p className="pod-job-subtitle">
                <strong>{job.customer?.company || 'Customer'}</strong> • {job.service?.replace(/-/g, ' ')} • Date: {job.date}
              </p>
            </div>
          </div>
          
          <button className="pod-close-btn" onClick={onClose} title="Close POD Modal">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation for Admins */}
        {isAdmin && (
          <div className="pod-tab-nav">
            <button 
              className={`pod-tab-btn ${activeTab === 'view' ? 'active' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              <Eye size={16} />
              <span>View Gallery ({existingPhotos.length})</span>
            </button>
            <button 
              className={`pod-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={16} />
              <span>Upload / Manage POD</span>
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="pod-alert-banner error fade-in">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="pod-alert-banner success fade-in">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ================= VIEW MODE ================= */}
        {activeTab === 'view' && (
          <div className="pod-view-container">
            {existingPhotos.length > 0 ? (
              <div className="pod-viewer-main">
                {/* Main Large Image Viewport */}
                <div className="pod-image-stage">
                  {currentPhoto && (
                    <div className="pod-stage-inner">
                      <img 
                        src={currentPhoto.url} 
                        alt={currentPhoto.name || `Proof of delivery ${selectedPhotoIndex + 1}`}
                        className="pod-featured-image"
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                          transition: 'transform 0.2s ease-out'
                        }}
                        onClick={() => setIsLightboxOpen(true)}
                        title="Click to view full screen"
                      />
                      
                      {/* Interactive Controls Overlay */}
                      <div className="pod-controls-toolbar">
                        <div className="pod-ctrl-group">
                          <button onClick={handleZoomIn} title="Zoom In" className="pod-ctrl-btn">
                            <ZoomIn size={16} />
                          </button>
                          <button onClick={handleZoomOut} title="Zoom Out" className="pod-ctrl-btn">
                            <ZoomOut size={16} />
                          </button>
                          <button onClick={handleResetZoom} title="Reset Zoom" className="pod-ctrl-btn text">
                            Reset
                          </button>
                          <button onClick={handleRotate} title="Rotate 90°" className="pod-ctrl-btn">
                            <RotateCw size={16} />
                          </button>
                        </div>

                        <div className="pod-ctrl-group">
                          <a 
                            href={currentPhoto.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            download={currentPhoto.name || `POD_${job.id}.jpg`}
                            className="pod-ctrl-btn"
                            title="Download Original High-Res Image"
                          >
                            <Download size={16} />
                          </a>
                          <button 
                            onClick={() => setIsLightboxOpen(true)} 
                            title="Full Screen Lightbox" 
                            className="pod-ctrl-btn"
                          >
                            <Maximize2 size={16} />
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={(e) => handleDeletePhoto(currentPhoto, e)} 
                              title="Delete this photo" 
                              className="pod-ctrl-btn danger"
                              disabled={deletingPhotoId === currentPhoto.id}
                            >
                              {deletingPhotoId === currentPhoto.id ? (
                                <RefreshCw size={14} className="spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Navigation Arrows for Multiple Photos */}
                      {existingPhotos.length > 1 && (
                        <>
                          <button className="pod-nav-arrow left" onClick={handlePrevPhoto} title="Previous Photo">
                            <ChevronLeft size={24} />
                          </button>
                          <button className="pod-nav-arrow right" onClick={handleNextPhoto} title="Next Photo">
                            <ChevronRight size={24} />
                          </button>
                        </>
                      )}

                      {/* Photo Index Counter */}
                      <div className="pod-index-counter">
                        {selectedPhotoIndex + 1} of {existingPhotos.length}
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo Meta & Delivery Notes */}
                <div className="pod-meta-card">
                  {currentPhoto && (
                    <div className="pod-meta-grid">
                      <div className="pod-meta-item">
                        <Clock size={14} />
                        <div>
                          <span className="pod-meta-label">Delivered / Uploaded</span>
                          <span className="pod-meta-val">{formatDateTime(currentPhoto.uploadedAt)}</span>
                        </div>
                      </div>
                      
                      <div className="pod-meta-item">
                        <User size={14} />
                        <div>
                          <span className="pod-meta-label">Verified By</span>
                          <span className="pod-meta-val">
                            {currentPhoto.uploadedByName} ({currentPhoto.uploadedByRole === 'superadmin' ? 'Super Admin' : 'Admin Dispatch'})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {podNotes && (
                    <div className="pod-notes-box">
                      <div className="pod-notes-header">
                        <FileText size={14} />
                        <span>Delivery Location / Notes:</span>
                      </div>
                      <p className="pod-notes-text">{podNotes}</p>
                    </div>
                  )}
                </div>

                {/* Thumbnail Strip for Multi-Photo Gallery */}
                {existingPhotos.length > 1 && (
                  <div className="pod-thumbnail-strip">
                    {existingPhotos.map((photo, idx) => (
                      <div 
                        key={photo.id || idx}
                        className={`pod-strip-thumb ${idx === selectedPhotoIndex ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedPhotoIndex(idx);
                          setZoomLevel(1);
                          setRotation(0);
                        }}
                      >
                        <img src={photo.url} alt={`Thumb ${idx + 1}`} />
                        {idx === selectedPhotoIndex && <div className="thumb-active-ring"></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="pod-empty-state">
                <div className="pod-empty-icon-box">
                  <ImageIcon size={44} />
                </div>
                <h3>No Proof of Delivery Photos Yet</h3>
                <p>
                  {isAdmin 
                    ? "As an Administrator, you can upload Proof of Delivery photos, receiver signatures, or drop-off confirmation pics for this job."
                    : "The dispatch team or administrator has not uploaded Proof of Delivery photos for this job yet. Check back once delivery is completed."}
                </p>
                {isAdmin && (
                  <button 
                    className="btn-pod-primary"
                    onClick={() => setActiveTab('upload')}
                  >
                    <Upload size={16} />
                    <span>Upload POD Photos Now</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= UPLOAD / MANAGE MODE (ADMINS ONLY) ================= */}
        {activeTab === 'upload' && isAdmin && (
          <div className="pod-upload-container">
            {/* Drag & Drop Area */}
            <div 
              className="pod-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const filesArray = Array.from(e.dataTransfer.files);
                  const validImageFiles = filesArray.filter(f => f.type.startsWith('image/'));
                  if (validImageFiles.length > 0) {
                    const newPreviews = validImageFiles.map(f => URL.createObjectURL(f));
                    setSelectedFiles(prev => [...prev, ...validImageFiles]);
                    setFilePreviews(prev => [...prev, ...newPreviews]);
                    setErrorMessage(null);
                  } else {
                    setErrorMessage("Only image files are supported.");
                  }
                }
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                multiple 
                accept="image/*"
                style={{ display: 'none' }} 
              />
              <div className="pod-drop-icon">
                <Upload size={32} />
              </div>
              <div className="pod-drop-text">
                <strong>Click to browse</strong> or drag and drop delivery photos here
              </div>
              <span className="pod-drop-hint">Supports PNG, JPG, JPEG, WEBP • Multiple photos allowed</span>
            </div>

            {/* Selected File Previews */}
            {selectedFiles.length > 0 && (
              <div className="pod-selected-files-section">
                <div className="section-subtitle">Selected Photos to Upload ({selectedFiles.length})</div>
                <div className="pod-preview-grid">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="pod-preview-card">
                      <img src={filePreviews[idx]} alt={file.name} className="pod-preview-img" />
                      <div className="pod-preview-info">
                        <span className="pod-file-name" title={file.name}>{file.name}</span>
                        <span className="pod-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button 
                        className="pod-remove-preview-btn" 
                        onClick={(e) => { e.stopPropagation(); handleRemoveSelectedFile(idx); }}
                        title="Remove photo"
                        disabled={isUploading}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Notes / Location Input */}
            <div className="pod-form-group">
              <label htmlFor="pod-notes-input">
                <FileText size={14} />
                <span>Delivery Notes / Specific Drop-off Location (Optional)</span>
              </label>
              <textarea 
                id="pod-notes-input"
                rows={3}
                placeholder="e.g. Received by reception staff (John D.), left on mail counter, signed manifest."
                value={newPodNotes}
                onChange={(e) => setNewPodNotes(e.target.value)}
                disabled={isUploading}
              />
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="pod-progress-wrapper fade-in">
                <div className="pod-progress-label">
                  <RefreshCw size={14} className="spin" />
                  <span>{uploadStatusText}</span>
                  <span className="pod-percentage">{uploadProgress}%</span>
                </div>
                <div className="pod-progress-track">
                  <div className="pod-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pod-action-footer">
              <button 
                className="btn-pod-secondary" 
                onClick={onClose}
                disabled={isUploading}
              >
                Cancel
              </button>

              {existingPhotos.length > 0 && selectedFiles.length === 0 && newPodNotes !== podNotes && (
                <button 
                  className="btn-pod-secondary" 
                  onClick={handleSaveNotesOnly}
                  disabled={isUploading}
                  style={{ color: 'var(--ink)' }}
                >
                  Save Notes Only
                </button>
              )}

              <button 
                className="btn-pod-primary"
                onClick={handleUploadPod}
                disabled={isUploading || (selectedFiles.length === 0 && !newPodNotes)}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Upload & Attach POD</span>
                  </>
                )}
              </button>
            </div>

            {/* Existing Uploaded Photos Management List */}
            {existingPhotos.length > 0 && (
              <div className="pod-existing-mgmt-section">
                <div className="section-subtitle">Attached POD Photos ({existingPhotos.length})</div>
                <div className="pod-existing-grid">
                  {existingPhotos.map((photo, idx) => (
                    <div key={photo.id || idx} className="pod-existing-card">
                      <img src={photo.url} alt={photo.name} className="pod-existing-thumb" />
                      <div className="pod-existing-meta">
                        <span className="name">{photo.name}</span>
                        <span className="time">{formatDateTime(photo.uploadedAt)}</span>
                      </div>
                      <button 
                        className="pod-delete-btn"
                        onClick={(e) => handleDeletePhoto(photo, e)}
                        title="Delete this photo"
                        disabled={deletingPhotoId === photo.id}
                      >
                        {deletingPhotoId === photo.id ? (
                          <RefreshCw size={14} className="spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= FULL SCREEN LIGHTBOX MODAL ================= */}
        {isLightboxOpen && currentPhoto && (
          <div className="pod-lightbox-overlay fade-in" onClick={() => setIsLightboxOpen(false)}>
            <div className="pod-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button 
                className="pod-lightbox-close" 
                onClick={() => setIsLightboxOpen(false)}
                title="Close Full Screen"
              >
                <X size={24} />
              </button>

              <div className="pod-lightbox-img-wrapper">
                <img 
                  src={currentPhoto.url} 
                  alt={currentPhoto.name || "Proof of Delivery"} 
                  className="pod-lightbox-img"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
                  }}
                />
              </div>

              {/* Lightbox Navigation */}
              {existingPhotos.length > 1 && (
                <>
                  <button className="pod-lightbox-nav left" onClick={handlePrevPhoto} title="Previous Photo">
                    <ChevronLeft size={36} />
                  </button>
                  <button className="pod-lightbox-nav right" onClick={handleNextPhoto} title="Next Photo">
                    <ChevronRight size={36} />
                  </button>
                </>
              )}

              {/* Lightbox Bottom Details Banner */}
              <div className="pod-lightbox-banner">
                <div className="banner-left">
                  <h4>Proof of Delivery • {job.customer?.company}</h4>
                  <p>Uploaded: {formatDateTime(currentPhoto.uploadedAt)} by {currentPhoto.uploadedByName}</p>
                  {podNotes && <p className="notes">Note: {podNotes}</p>}
                </div>
                <div className="banner-right">
                  <button onClick={handleZoomIn} className="lightbox-tool-btn" title="Zoom In"><ZoomIn size={18} /></button>
                  <button onClick={handleZoomOut} className="lightbox-tool-btn" title="Zoom Out"><ZoomOut size={18} /></button>
                  <button onClick={handleRotate} className="lightbox-tool-btn" title="Rotate"><RotateCw size={18} /></button>
                  <a 
                    href={currentPhoto.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    download 
                    className="lightbox-tool-btn download"
                    title="Download Photo"
                  >
                    <Download size={18} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Styled JSX for POD Modal */}
      <style>{`
        .pod-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(10, 30, 24, 0.65);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5000;
          padding: 20px;
          overflow-y: auto;
        }

        .pod-modal-card {
          width: 100%;
          background: #FFFFFF;
          border-radius: 24px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
          padding: 28px;
          position: relative;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .pod-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .pod-header-info {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .pod-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #095c7b, #1A3D33);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFF;
          flex-shrink: 0;
          box-shadow: 0 6px 16px rgba(9, 92, 123, 0.25);
        }

        .pod-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .pod-title-row h2 {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
        }

        .pod-status-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .pod-status-chip.verified {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .pod-status-chip.pending {
          background: rgba(234, 179, 8, 0.12);
          color: #ca8a04;
          border: 1px solid rgba(234, 179, 8, 0.3);
        }

        .pod-job-subtitle {
          font-size: 0.88rem;
          color: var(--ink-soft);
          margin-top: 4px;
          opacity: 0.85;
        }

        .pod-close-btn {
          background: rgba(0, 0, 0, 0.05);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-soft);
          cursor: pointer;
          transition: all 0.2s;
        }

        .pod-close-btn:hover {
          background: rgba(0, 0, 0, 0.1);
          color: var(--ink);
          transform: rotate(90deg);
        }

        /* Tabs */
        .pod-tab-nav {
          display: flex;
          gap: 8px;
          background: rgba(0, 0, 0, 0.04);
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .pod-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--ink-soft);
          background: transparent;
          border: none;
          transition: all 0.2s;
        }

        .pod-tab-btn.active {
          background: #FFFFFF;
          color: var(--ink);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        /* Alerts */
        .pod-alert-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .pod-alert-banner.error {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .pod-alert-banner.success {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }

        /* View Mode Main */
        .pod-view-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pod-image-stage {
          background: #0f172a;
          border-radius: 18px;
          overflow: hidden;
          position: relative;
          min-height: 340px;
          max-height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pod-stage-inner {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow: hidden;
        }

        .pod-featured-image {
          max-width: 100%;
          max-height: 420px;
          object-fit: contain;
          border-radius: 8px;
          cursor: zoom-in;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .pod-controls-toolbar {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(8px);
          padding: 6px 14px;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          z-index: 10;
        }

        .pod-ctrl-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pod-ctrl-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #FFF;
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pod-ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.1);
        }

        .pod-ctrl-btn.text {
          width: auto;
          padding: 0 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .pod-ctrl-btn.danger:hover {
          background: #ef4444;
          color: white;
        }

        .pod-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(15, 23, 42, 0.7);
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        }

        .pod-nav-arrow:hover {
          background: rgba(15, 23, 42, 0.95);
          transform: translateY(-50%) scale(1.1);
        }

        .pod-nav-arrow.left { left: 16px; }
        .pod-nav-arrow.right { right: 16px; }

        .pod-index-counter {
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 0.75rem;
          font-weight: 700;
          backdrop-filter: blur(4px);
        }

        /* Meta Card */
        .pod-meta-card {
          background: var(--offwhite, #FFFDF6);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 16px 20px;
        }

        .pod-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 12px;
        }

        .pod-meta-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--ink-soft);
        }

        .pod-meta-label {
          display: block;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.6;
          font-weight: 700;
        }

        .pod-meta-val {
          display: block;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--ink);
        }

        .pod-notes-box {
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          padding-top: 10px;
          margin-top: 8px;
        }

        .pod-notes-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--gold, #A8763A);
          margin-bottom: 4px;
        }

        .pod-notes-text {
          font-size: 0.88rem;
          color: var(--ink);
          line-height: 1.4;
          font-style: italic;
        }

        /* Thumbnail Strip */
        .pod-thumbnail-strip {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 6px 2px;
        }

        .pod-strip-thumb {
          width: 72px;
          height: 72px;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          flex-shrink: 0;
          border: 2px solid transparent;
          transition: all 0.2s;
        }

        .pod-strip-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pod-strip-thumb.active {
          border-color: #095c7b;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(9, 92, 123, 0.25);
        }

        /* Empty State */
        .pod-empty-state {
          padding: 48px 24px;
          text-align: center;
          background: var(--offwhite, #FFFDF6);
          border-radius: 18px;
          border: 2px dashed rgba(0, 0, 0, 0.1);
        }

        .pod-empty-icon-box {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(9, 92, 123, 0.1);
          color: #095c7b;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .pod-empty-state h3 {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--ink);
          margin-bottom: 8px;
        }

        .pod-empty-state p {
          color: var(--ink-soft);
          font-size: 0.9rem;
          max-width: 440px;
          margin: 0 auto 24px;
        }

        /* Upload Mode */
        .pod-upload-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pod-dropzone {
          border: 2px dashed #095c7b;
          background: rgba(9, 92, 123, 0.03);
          border-radius: 18px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pod-dropzone:hover {
          background: rgba(9, 92, 123, 0.08);
          border-color: #1A3D33;
        }

        .pod-drop-icon {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: rgba(9, 92, 123, 0.12);
          color: #095c7b;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
        }

        .pod-drop-text {
          font-size: 0.95rem;
          color: var(--ink);
          margin-bottom: 4px;
        }

        .pod-drop-hint {
          font-size: 0.78rem;
          color: var(--ink-soft);
          opacity: 0.7;
        }

        .section-subtitle {
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--ink-soft);
          opacity: 0.7;
          margin-bottom: 10px;
        }

        .pod-preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 12px;
        }

        .pod-preview-card {
          position: relative;
          background: var(--offwhite);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.08);
        }

        .pod-preview-img {
          width: 100%;
          height: 90px;
          object-fit: cover;
        }

        .pod-preview-info {
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
        }

        .pod-file-name {
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--ink);
        }

        .pod-file-size {
          font-size: 0.65rem;
          color: var(--ink-soft);
          opacity: 0.6;
        }

        .pod-remove-preview-btn {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.65);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .pod-form-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 8px;
          opacity: 0.8;
        }

        .pod-form-group textarea {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.8);
          font-size: 0.9rem;
          outline: none;
          font-family: inherit;
        }

        .pod-form-group textarea:focus {
          border-color: #095c7b;
          box-shadow: 0 0 0 2px rgba(9, 92, 123, 0.15);
        }

        .pod-progress-wrapper {
          background: var(--offwhite);
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.08);
        }

        .pod-progress-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 6px;
        }

        .pod-percentage {
          margin-left: auto;
          color: #095c7b;
        }

        .pod-progress-track {
          height: 6px;
          background: rgba(0, 0, 0, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }

        .pod-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #095c7b, #22c55e);
          transition: width 0.3s ease;
        }

        .pod-action-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          align-items: center;
          margin-top: 8px;
        }

        .btn-pod-primary {
          background: linear-gradient(135deg, #095c7b, #1A3D33);
          color: #FFFFFF;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(9, 92, 123, 0.25);
          transition: all 0.2s;
        }

        .btn-pod-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(9, 92, 123, 0.35);
        }

        .btn-pod-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-pod-secondary {
          background: rgba(0, 0, 0, 0.05);
          color: var(--ink-soft);
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-pod-secondary:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.1);
        }

        /* Existing Management Grid */
        .pod-existing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }

        .pod-existing-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--offwhite);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .pod-existing-thumb {
          width: 44px;
          height: 44px;
          border-radius: 6px;
          object-fit: cover;
        }

        .pod-existing-meta {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .pod-existing-meta .name {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pod-existing-meta .time {
          font-size: 0.68rem;
          color: var(--ink-soft);
          opacity: 0.6;
        }

        .pod-delete-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pod-delete-btn:hover {
          background: #dc2626;
          color: white;
        }

        /* Full Screen Lightbox */
        .pod-lightbox-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.92);
          z-index: 6000;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(12px);
        }

        .pod-lightbox-content {
          position: relative;
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .pod-lightbox-close {
          position: absolute;
          top: 24px;
          right: 24px;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: all 0.2s;
        }

        .pod-lightbox-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .pod-lightbox-img-wrapper {
          max-width: 90vw;
          max-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .pod-lightbox-img {
          max-width: 90vw;
          max-height: 80vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
          transition: transform 0.2s ease-out;
        }

        .pod-lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: none;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 20;
        }

        .pod-lightbox-nav:hover {
          background: rgba(255, 255, 255, 0.35);
          transform: translateY(-50%) scale(1.1);
        }

        .pod-lightbox-nav.left { left: 24px; }
        .pod-lightbox-nav.right { right: 24px; }

        .pod-lightbox-banner {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 800px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 18px;
          padding: 14px 20px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 20;
        }

        .banner-left h4 {
          margin: 0 0 4px 0;
          color: white;
          font-size: 1rem;
        }

        .banner-left p {
          margin: 0;
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .banner-left p.notes {
          color: #facc15;
          margin-top: 2px;
          font-style: italic;
        }

        .banner-right {
          display: flex;
          gap: 8px;
        }

        .lightbox-tool-btn {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .lightbox-tool-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .lightbox-tool-btn.download {
          background: #095c7b;
        }

        .lightbox-tool-btn.download:hover {
          background: #0ea5e9;
        }
      `}</style>
    </div>
  );
};

export default PodModal;
