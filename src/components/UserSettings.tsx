import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Settings, User, Calendar, Clock, Briefcase } from "lucide-react";
import { 
  getUserPreferences, 
  saveUserPreferences, 
  DEFAULT_USER_PREFERENCES,
  getTodaysDate 
} from "@/utils/formUtils";

interface UserSettingsProps {
  onClose?: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);

  // Load user preferences on component mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const userPrefs = await getUserPreferences();
      setPreferences(userPrefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveUserPreferences(preferences);
      toast.success('Settings saved successfully!');
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof typeof preferences, value: string | boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <Card className="shadow-md">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
          <span>Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Daily Cheer Tracker Settings
        </CardTitle>
        <CardDescription>
          Configure your default values to speed up daily form filling. These values will be automatically used when you click "Fill Sample Data" or autofill the form.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Person Name Setting */}
        <div className="space-y-2">
          <Label htmlFor="person-name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Your Name (for "who are you" dropdown)
          </Label>
          <Input
            id="person-name"
            value={preferences.person_name}
            onChange={(e) => updatePreference('person_name', e.target.value)}
            placeholder="e.g., PG, agent 1, John Doe"
            className="w-full"
          />
          <p className="text-sm text-gray-600">
            Enter your name exactly as it appears in the dropdown options
          </p>
        </div>

        {/* Project Name Setting */}
        <div className="space-y-2">
          <Label htmlFor="project-name" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Default Project Name
          </Label>
          <Input
            id="project-name"
            value={preferences.project_name}
            onChange={(e) => updatePreference('project_name', e.target.value)}
            placeholder="e.g., Project Alpha, Client Work, Development"
            className="w-full"
          />
          <p className="text-sm text-gray-600">
            Your most commonly worked on project
          </p>
        </div>

        {/* Time Spent Setting */}
        <div className="space-y-2">
          <Label htmlFor="time-spent" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Default Time Spent (hours)
          </Label>
          <Select 
            value={preferences.time_spent} 
            onValueChange={(value) => updatePreference('time_spent', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select default time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.25">0.25 hours (15 minutes)</SelectItem>
              <SelectItem value="0.5">0.5 hours (30 minutes)</SelectItem>
              <SelectItem value="0.75">0.75 hours (45 minutes)</SelectItem>
              <SelectItem value="1">1 hour</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600">
            Your typical daily time spent (you mentioned 1 hour is most common)
          </p>
        </div>

        {/* Auto Date Setting */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Automatically use today's date
            </Label>
            <Switch
              id="auto-date"
              checked={preferences.auto_use_today_date}
              onCheckedChange={(checked) => updatePreference('auto_use_today_date', checked)}
            />
          </div>
          <p className="text-sm text-gray-600">
            When enabled, the date field will automatically be filled with today's date ({getTodaysDate()})
          </p>
        </div>

        {/* Preview Section */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Preview of your default values:</h4>
          <div className="space-y-1 text-sm">
            <div><strong>Name:</strong> {preferences.person_name}</div>
            <div><strong>Date:</strong> {preferences.auto_use_today_date ? getTodaysDate() + ' (today)' : 'Manual entry'}</div>
            <div><strong>Project:</strong> {preferences.project_name}</div>
            <div><strong>Time:</strong> {preferences.time_spent} hours</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {!saving && <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserSettings; 