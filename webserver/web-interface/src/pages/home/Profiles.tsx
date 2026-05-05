import React, { useState } from 'react';
import {
  QrCode, Upload, Plus, Minus, LineChart, Trash2,
} from 'lucide-react';
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ProfileChart from '@/components/chart/ProfileChart';
import { Profile, ProfileRaw } from '@/models/profile';

interface BuilderElement {
  id: number;
  type: 'select' | 'text';
  value: string;
}

const initialElements: BuilderElement[] = [
  { id: 1, type: 'select', value: '' },
  { id: 2, type: 'select', value: '' },
  { id: 3, type: 'text', value: '' },
  { id: 4, type: 'text', value: '' },
  { id: 5, type: 'text', value: '' },
  { id: 6, type: 'text', value: '' },
];

export default function Profiles() {
  const [elements, setElements] = useState<BuilderElement[]>(initialElements);
  const [nextId, setNextId] = useState(7);
  const [error, setError] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<Profile>(new Profile([]));

  const handleAddRow = () => {
    setElements([
      ...elements,
      { id: nextId, type: 'select', value: '' },
      { id: nextId + 1, type: 'select', value: '' },
      { id: nextId + 2, type: 'text', value: '' },
      { id: nextId + 3, type: 'text', value: '' },
      { id: nextId + 4, type: 'text', value: '' },
      { id: nextId + 5, type: 'text', value: '' },
    ]);
    setNextId(nextId + 6);
  };

  const handleRemoveRow = () => {
    setElements(elements.slice(0, -6));
  };

  const handleRemoveAll = () => {
    setElements(initialElements);
    setNextId(7);
  };

  const updateProfile = (value: string) => {
    try {
      setProfile(Profile.parse(JSON.parse(value) as ProfileRaw));
      setError(undefined);
    } catch (er) {
      setError((er as Error).message);
    }
  };

  const handleSelectChange = (value: string, id: number) => {
    setElements(elements.map((el) => (el.id === id ? { ...el, value } : el)));
  };

  const handleTextChange = (value: string, id: number) => {
    setElements(elements.map((el) => (el.id === id ? { ...el, value } : el)));
  };

  return (
    <div className="container mx-auto px-4 mt-2 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Load Profile</CardTitle>
        </CardHeader>
        <CardFooter>
          <Button variant="ghost" size="icon" asChild>
            <label htmlFor="profile-bin" aria-label="Upload .bin profile" className="cursor-pointer">
              <Upload />
              <input id="profile-bin" hidden accept=".bin" type="file" />
            </label>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <label htmlFor="profile-qr" aria-label="Upload QR" className="cursor-pointer">
              <QrCode />
              <input id="profile-qr" hidden accept=".png" type="file" />
            </label>
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl">Build Profile</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleRemoveAll} aria-label="Remove all">
              <Trash2 />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRemoveRow} aria-label="Remove row">
              <Minus />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleAddRow} aria-label="Add row">
              <Plus />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Auto graph">
              <LineChart />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2">
            {elements.map((element) => (element.type === 'select' ? (
              <div key={element.id} className="col-span-6">
                <Select value={element.value} onValueChange={(v) => handleSelectChange(v, element.id)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Phase type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Preinfusion</SelectItem>
                    <SelectItem value="2">Soak</SelectItem>
                    <SelectItem value="3">Flow</SelectItem>
                    <SelectItem value="4">Pressure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div key={element.id} className="col-span-3">
                <Input
                  value={element.value}
                  onChange={(e) => handleTextChange(e.target.value, element.id)}
                />
              </div>
            )))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Profile syntax playground</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant={error ? 'destructive' : 'default'}>
            <AlertDescription>{error || 'Nice syntax!'}</AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Textarea
                rows={15}
                onChange={(evt) => updateProfile(evt.target.value)}
                className="font-mono text-xs h-full min-h-[24rem]"
              />
            </div>
            <div className="sm:col-span-2 relative h-[400px]">
              <ProfileChart profile={profile} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
