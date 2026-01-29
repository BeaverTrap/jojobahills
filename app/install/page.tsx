export default function InstallPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Install JoJoba Hills SKP Maintenance App</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-3">Android (Chrome)</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Open this app in Chrome browser on your Android device</li>
            <li>Tap the menu (three dots) in the top-right corner</li>
            <li>Select "Add to Home screen" or "Install app"</li>
            <li>Confirm the installation</li>
            <li>The app icon will appear on your home screen</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Automatic Install Prompt</h2>
          <p className="text-gray-700">
            If you see an "Install App" button at the bottom-right of the screen,
            tap it to install the app directly.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Requirements</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Android device with Chrome browser</li>
            <li>App must be accessed over HTTPS (or localhost for development)</li>
            <li>App must have a valid manifest file</li>
          </ul>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> After installation, you can use the app offline
            (once data is cached) and it will behave like a native app.
          </p>
        </div>
      </div>
    </div>
  );
}
