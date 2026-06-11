import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminSettings() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card className="mt-6">
        <CardHeader><CardTitle>System Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-500">
          <p>Configure hospital settings, notification preferences, and integrations from environment variables.</p>
          <ul className="list-inside list-disc space-y-1">
            <li>MongoDB Atlas connection</li>
            <li>OpenAI API for AI assistant</li>
            <li>Cloudinary for file uploads</li>
            <li>SMTP for email notifications</li>
            <li>Google Maps API for hospital locator</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
