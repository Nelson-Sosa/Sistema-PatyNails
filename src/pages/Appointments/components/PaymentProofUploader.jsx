import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { uploadImage } from '@/services/cloudinary/cloudinaryService'
import { cn } from '@/utils/cn'

// Only allow image formats — no PDF, Word, Excel.
// Reasons: instant preview, smaller size, mobile-friendly, Cloudinary-compatible.
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = '.jpg, .jpeg, .png, .webp'
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const CLOUDINARY_FOLDER = 'patynails/comprobantes'

/**
 * PaymentProofUploader
 *
 * Self-contained uploader for bank transfer proof images.
 * Handles: selection, preview, client-side validation, Cloudinary upload, progress.
 *
 * Props:
 *   onUploaded({ publicId, secureUrl }) — called when Cloudinary upload succeeds
 *   onClear()                           — called when the user removes the selected file
 *   disabled                            — disables all interactions
 *
 * @param {{ onUploaded: Function, onClear: Function, disabled?: boolean }} props
 */
export default function PaymentProofUploader({ onUploaded, onClear, disabled = false }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState(null) // { publicId, secureUrl }
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const validateFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return `Formato no permitido. Usá JPG, PNG o WEBP.`
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `La imagen es demasiado grande. Máximo ${MAX_SIZE_MB} MB.`
    }
    return null
  }

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setError(null)
    setUploaded(null)
    setProgress(0)

    const validationError = validateFile(selected)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }

    setFile(selected)
    setPreview(URL.createObjectURL(selected))

    // Auto-upload to Cloudinary once a valid file is selected
    try {
      setUploading(true)
      const result = await uploadImage(selected, CLOUDINARY_FOLDER, (pct) => setProgress(pct))
      setUploaded(result)
      onUploaded?.(result)
    } catch (err) {
      setError(err.message || 'Error al subir el comprobante. Intentá de nuevo.')
      setFile(null)
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setPreview(null)
    setUploaded(null)
    setError(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (disabled || uploading) return
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      // Simulate a file input change event
      const dt = new DataTransfer()
      dt.items.add(dropped)
      if (inputRef.current) {
        inputRef.current.files = dt.files
        inputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone / trigger */}
      {!file && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
            disabled
              ? 'border-brand-border opacity-50 cursor-not-allowed'
              : 'border-brand-border hover:border-brand-primary/50 hover:bg-brand-pastel/10'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-pastel">
            <Upload className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-brand-text">
              Seleccioná o arrastrá tu comprobante
            </p>
            <p className="mt-0.5 text-xs text-brand-text-muted">
              {ALLOWED_EXTENSIONS} · Máx. {MAX_SIZE_MB} MB
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {/* Preview + progress */}
      {file && (
        <div className="relative overflow-hidden rounded-xl border border-brand-border bg-brand-card">
          {/* Image preview */}
          {preview && (
            <img
              src={preview}
              alt="Vista previa del comprobante"
              className="w-full max-h-48 object-cover"
            />
          )}

          {/* Uploading overlay with progress bar */}
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-sm">
              <p className="text-sm font-medium text-white">Subiendo comprobante…</p>
              <div className="w-3/4 overflow-hidden rounded-full bg-white/20 h-2">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-white/70">{progress}%</p>
            </div>
          )}

          {/* Success / clear banner */}
          {uploaded && !uploading && (
            <div className="flex items-center justify-between gap-2 border-t border-brand-border bg-emerald-500/10 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-xs font-medium text-emerald-400">Comprobante subido correctamente</p>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded p-0.5 text-brand-text-muted hover:text-brand-text transition-colors"
                  title="Quitar comprobante"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Remove button when no upload yet */}
          {!uploaded && !uploading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
              title="Quitar imagen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      )}
    </div>
  )
}
