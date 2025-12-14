import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { MedicalHistory } from '@/lib/types';

const historySchema = z.object({
  demographics: z.object({
    age: z.number().min(0).max(150),
    sex: z.enum(['M', 'F', 'Other']),
    height_cm: z.number().optional(),
    weight_kg: z.number().optional(),
  }),
  allergies: z.string(),
  medications: z.string(),
  conditions: z.string(),
  surgeries: z.string(),
  family_history: z.string(),
  social_history: z.object({
    smoking: z.string().optional(),
    alcohol: z.string().optional(),
    occupation: z.string().optional(),
    activity_level: z.string().optional(),
  }),
  current_symptoms: z.string(),
  additional_info: z.string().optional(),
  past_incidents: z.array(z.object({
    title: z.string(),
    date: z.string(),
    description: z.string(),
    files: z.array(z.string())
  })).optional(),
});

type HistoryFormData = z.infer<typeof historySchema>;

interface HistoryFormProps {
  initialData?: MedicalHistory;
  onSubmit: (data: MedicalHistory) => Promise<void>;
  loading?: boolean;
}

export function HistoryForm({ initialData, onSubmit, loading }: HistoryFormProps) {
  const { register, control, handleSubmit, formState: { errors }, setValue, watch } = useForm<HistoryFormData>({
    resolver: zodResolver(historySchema),
    defaultValues: initialData ? {
      demographics: {
        age: initialData.demographics.age,
        sex: initialData.demographics.sex,
        height_cm: initialData.demographics.height_cm,
        weight_kg: initialData.demographics.weight_kg,
      },
      allergies: initialData.allergies.join(', '),
      medications: initialData.medications.map(m => `${m.name} ${m.dose || ''}`).join(', '),
      conditions: initialData.conditions.join(', '),
      surgeries: initialData.surgeries.join(', '),
      family_history: initialData.family_history.join(', '),
      social_history: {
        smoking: initialData.social_history.smoking,
        alcohol: initialData.social_history.alcohol,
        occupation: initialData.social_history.occupation,
        activity_level: initialData.social_history.activity_level,
      },
      current_symptoms: initialData.current_symptoms.join(', '),
      additional_info: initialData.additional_info,
      past_incidents: initialData.past_incidents || [],
    } : {
      past_incidents: []
    },
  });

  const handleFormSubmit = async (data: HistoryFormData) => {
    const history: MedicalHistory = {
      demographics: {
        age: data.demographics.age,
        sex: data.demographics.sex,
        height_cm: data.demographics.height_cm,
        weight_kg: data.demographics.weight_kg,
      },
      allergies: data.allergies.split(',').map(s => s.trim()).filter(Boolean),
      medications: data.medications.split(',').map(s => {
        const parts = s.trim().split(' ');
        return { name: parts[0], dose: parts.slice(1).join(' ') || undefined };
      }).filter(m => m.name),
      conditions: data.conditions.split(',').map(s => s.trim()).filter(Boolean),
      surgeries: data.surgeries.split(',').map(s => s.trim()).filter(Boolean),
      family_history: data.family_history.split(',').map(s => s.trim()).filter(Boolean),
      social_history: {
        smoking: data.social_history.smoking,
        alcohol: data.social_history.alcohol,
        occupation: data.social_history.occupation,
        activity_level: data.social_history.activity_level,
      },
      current_symptoms: data.current_symptoms.split(',').map(s => s.trim()).filter(Boolean),
      additional_info: data.additional_info,
      past_incidents: data.past_incidents?.map(i => ({
        title: i.title || '',
        date: i.date || '',
        description: i.description || '',
        files: i.files || []
      })) || [],
    };
    await onSubmit(history);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Demographics</CardTitle>
          <CardDescription>Basic information about you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                {...register('demographics.age', { valueAsNumber: true })}
                className={errors.demographics?.age ? 'border-destructive' : ''}
              />
              {errors.demographics?.age && (
                <p className="text-sm text-destructive">{errors.demographics.age.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">Sex *</Label>
              <Select onValueChange={(value) => setValue('demographics.sex', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                {...register('demographics.height_cm', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                {...register('demographics.weight_kg', { valueAsNumber: true })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medical Information</CardTitle>
          <CardDescription>Your medical history (separate items with commas)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Input
              id="allergies"
              placeholder="e.g., Penicillin, Peanuts, Latex"
              {...register('allergies')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medications">Current Medications</Label>
            <Textarea
              id="medications"
              placeholder="e.g., Lisinopril 10mg daily, Metformin 500mg twice daily"
              {...register('medications')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conditions">Medical Conditions</Label>
            <Textarea
              id="conditions"
              placeholder="e.g., Hypertension, Type 2 Diabetes, Asthma"
              {...register('conditions')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="surgeries">Past Surgeries</Label>
            <Textarea
              id="surgeries"
              placeholder="e.g., Appendectomy 2015, Knee replacement 2020"
              {...register('surgeries')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="family_history">Family History</Label>
            <Textarea
              id="family_history"
              placeholder="e.g., Father: heart disease, Mother: diabetes"
              {...register('family_history')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social History</CardTitle>
          <CardDescription>Lifestyle factors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smoking">Smoking Status</Label>
              <Input
                id="smoking"
                placeholder="e.g., Never, Former, Current (1 pack/day)"
                {...register('social_history.smoking')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alcohol">Alcohol Use</Label>
              <Input
                id="alcohol"
                placeholder="e.g., Social, 2-3 drinks/week, None"
                {...register('social_history.alcohol')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                placeholder="e.g., Office worker, Construction"
                {...register('social_history.occupation')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity">Activity Level</Label>
              <Input
                id="activity"
                placeholder="e.g., Sedentary, Moderate, Active"
                {...register('social_history.activity_level')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past Incidents & Injuries</CardTitle>
          <CardDescription>Record past injuries and upload relevant documents (X-rays, reports)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PastIncidentsField
            control={control}
            register={register}
            setValue={setValue}
            watch={watch}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Symptoms</CardTitle>
          <CardDescription>What brings you here today?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symptoms">Symptoms</Label>
            <Textarea
              id="symptoms"
              placeholder="e.g., Headache, Fever, Cough, Fatigue"
              {...register('current_symptoms')}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional">Additional Information</Label>
            <Textarea
              id="additional"
              placeholder="Any other information you think is relevant"
              {...register('additional_info')}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? 'Saving...' : 'Save Medical History'}
      </Button>
    </form>
  );
}

// Sub-component for Past Incidents
import { useFieldArray, Control, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Plus, Trash2, Upload, FileText, X } from 'lucide-react';
import { uploadFile } from '@/lib/queries';
import { getProfile } from '@/lib/auth';

function PastIncidentsField({
  control,
  register,
  setValue,
  watch
}: {
  control: Control<HistoryFormData>,
  register: UseFormRegister<HistoryFormData>,
  setValue: UseFormSetValue<HistoryFormData>,
  watch: UseFormWatch<HistoryFormData>
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "past_incidents"
  });

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const profile = getProfile();
      if (!profile?.patient_id) return;

      const result = await uploadFile(profile.patient_id, file);

      const currentFiles = watch(`past_incidents.${index}.files`) || [];
      setValue(`past_incidents.${index}.files`, [...currentFiles, result.file_id]);
    } catch (error) {
      console.error("Upload failed", error);
      // Ideally show toast here
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/10">
          <div className="flex justify-between items-start">
            <h4 className="font-medium">Incident #{index + 1}</h4>
            <Button variant="ghost" size="sm" onClick={() => remove(index)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...register(`past_incidents.${index}.title` as any)} placeholder="e.g. Broken Arm" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...register(`past_incidents.${index}.date` as any)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register(`past_incidents.${index}.description` as any)} placeholder="Details about the incident..." />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {watch(`past_incidents.${index}.files` as any)?.map((fileId: string, fIndex: number) => (
                <div key={fileId} className="flex items-center bg-background border rounded px-2 py-1 text-sm">
                  <FileText className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[100px]">{fileId.slice(0, 8)}...</span>
                </div>
              ))}
            </div>
            <div className="flex items-center">
              <Input
                type="file"
                className="hidden"
                id={`file-upload-${index}`}
                onChange={(e) => handleFileUpload(index, e)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`file-upload-${index}`)?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={() => append({ title: '', date: '', description: '', files: [] })}>
        <Plus className="h-4 w-4 mr-2" />
        Add Incident
      </Button>
    </div>
  );
}
