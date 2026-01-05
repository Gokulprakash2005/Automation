import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">AI Sales OS</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Automate LinkedIn outreach with AI
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect your LinkedIn account and let AI handle your sales conversations
          </p>
          <Link href="/onboarding/linkedin">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Connect LinkedIn
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
