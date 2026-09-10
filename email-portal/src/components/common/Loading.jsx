const Loading = ({ text = 'Loading...', fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-4 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="spinner w-8 h-8 border-4 border-primary-600 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">{text}</p>
      </div>
    </div>
  )
}

export default Loading