import { useState } from 'react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { MdClose, MdFileUpload, MdDownload } from 'react-icons/md'
import emailService from '@/services/emailService'
import toast from 'react-hot-toast'

const ImportContactsModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setFile(selectedFile)
    
    // Preview first few lines
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').slice(0, 4) // Header + 3 rows
      setPreview(lines)
    }
    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a CSV file')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      await emailService.importContacts(formData)
      toast.success('Contacts imported successfully!')
      onSuccess()
      onClose()
      setFile(null)
      setPreview([])
    } catch (error) {
      toast.error(error.message || 'Failed to import contacts')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = 'email,name,phone,company,tags\nexample@email.com,John Doe,+1234567890,Acme Inc,vip;customer'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Import Contacts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MdClose size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">CSV Format</h3>
            <p className="text-sm text-blue-700 mb-2">
              Your CSV file should have the following columns:
            </p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li><strong>email</strong> (required)</li>
              <li>name (optional)</li>
              <li>phone (optional)</li>
              <li>company (optional)</li>
              <li>tags (optional, semicolon-separated)</li>
            </ul>
          </div>

          {/* Download Template */}
          <Button
            variant="outline"
            icon={<MdDownload />}
            onClick={downloadTemplate}
            className="w-full"
          >
            Download CSV Template
          </Button>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <MdFileUpload size={48} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  {file ? file.name : 'Click to upload CSV file'}
                </span>
              </label>
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
              <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                {preview.map((line, i) => (
                  <div key={i} className={i === 0 ? 'font-bold' : ''}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              icon={<MdFileUpload />}
              onClick={handleImport}
              disabled={!file}
              loading={loading}
            >
              Import Contacts
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ImportContactsModal
