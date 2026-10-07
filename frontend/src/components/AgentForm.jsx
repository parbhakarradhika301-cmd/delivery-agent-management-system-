'use client';

/**
 * Shared agent creation and editing form.
 * Implements client-side validation, server-side field error mappings,
 * changed-fields detection for PATCH, and accessible labels.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiRequestError } from '@/lib/api';

export default function AgentForm({
  initialData = {},
  isEdit = false,
  onSubmit,
  onCancel,
}) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: initialData.fullName || '',
    phone: initialData.phone || '',
    email: initialData.email || '',
    serviceArea: initialData.serviceArea || '',
    status: initialData.status || 'active',
  });

  const [errors, setErrors] = useState({});
  const [topError, setTopError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate fields mirroring backend rules
  const validateForm = (data) => {
    const newErrors = {};

    const name = data.fullName.trim();
    if (!name) {
      newErrors.fullName = 'Full name is required';
    } else if (name.length < 2 || name.length > 100) {
      newErrors.fullName = 'Full name must be between 2 and 100 characters';
    }

    const phone = data.phone.trim();
    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      newErrors.phone = 'Phone must be 10–15 digits with an optional leading +';
    }

    const email = data.email.trim();
    if (!email) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please provide a valid email address';
    }

    const serviceArea = data.serviceArea.trim();
    if (!serviceArea) {
      newErrors.serviceArea = 'Service area is required';
    } else if (serviceArea.length < 2 || serviceArea.length > 100) {
      newErrors.serviceArea = 'Service area must be between 2 and 100 characters';
    }

    if (!['active', 'inactive'].includes(data.status)) {
      newErrors.status = 'Status must be active or inactive';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (topError) {
      setTopError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTopError('');

    // Client-side validation check
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    let payload = {};

    if (isEdit) {
      // For PATCH: send ONLY changed fields
      const trimmedName = formData.fullName.trim();
      const trimmedPhone = formData.phone.trim();
      const trimmedEmail = formData.email.trim().toLowerCase();
      const trimmedArea = formData.serviceArea.trim();

      if (trimmedName !== (initialData.fullName || '').trim()) {
        payload.fullName = trimmedName;
      }
      if (trimmedPhone !== (initialData.phone || '').trim()) {
        payload.phone = trimmedPhone;
      }
      if (trimmedEmail !== (initialData.email || '').trim().toLowerCase()) {
        payload.email = trimmedEmail;
      }
      if (trimmedArea !== (initialData.serviceArea || '').trim()) {
        payload.serviceArea = trimmedArea;
      }
      if (formData.status !== initialData.status) {
        payload.status = formData.status;
      }

      // If nothing changed, show message without calling API
      if (Object.keys(payload).length === 0) {
        setTopError('No changes to save');
        return;
      }
    } else {
      payload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        serviceArea: formData.serviceArea.trim(),
        status: formData.status,
      };
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await onSubmit(payload);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const fieldErrors = {};

        // 1. Map details array from 400 VALIDATION_ERROR
        if (Array.isArray(err.details) && err.details.length > 0) {
          err.details.forEach((d) => {
            if (d.field) {
              fieldErrors[d.field] = d.message;
            }
          });
        }

        // 2. Map 409 DUPLICATE_AGENT to email or phone field
        if (err.code === 'DUPLICATE_AGENT') {
          const msg = err.message.toLowerCase();
          if (msg.includes('email')) {
            fieldErrors.email = err.message;
          } else if (msg.includes('phone')) {
            fieldErrors.phone = err.message;
          } else {
            setTopError(err.message);
          }
        } else if (Object.keys(fieldErrors).length === 0) {
          setTopError(err.message);
        }

        setErrors(fieldErrors);
      } else {
        setTopError(err.message || 'An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {topError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-3"
        >
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span className="font-medium">{topError}</span>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-semibold text-zinc-800 mb-1.5"
        >
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="e.g. John Doe"
          className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all ${
            errors.fullName
              ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
              : 'border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500'
          }`}
          aria-invalid={errors.fullName ? 'true' : 'false'}
          aria-describedby={errors.fullName ? 'fullName-error' : undefined}
        />
        {errors.fullName && (
          <p id="fullName-error" className="mt-1.5 text-xs text-red-600 font-medium">
            {errors.fullName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-semibold text-zinc-800 mb-1.5"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. +919876543210"
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all ${
              errors.phone
                ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                : 'border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500'
            }`}
            aria-invalid={errors.phone ? 'true' : 'false'}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="mt-1.5 text-xs text-red-600 font-medium">
              {errors.phone}
            </p>
          )}
          <p className="mt-1 text-[11px] text-zinc-600">10–15 digits, optional leading +</p>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-zinc-800 mb-1.5"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g. agent@logistics.com"
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all ${
              errors.email
                ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                : 'border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500'
            }`}
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-red-600 font-medium">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Service Area */}
        <div>
          <label
            htmlFor="serviceArea"
            className="block text-sm font-semibold text-zinc-800 mb-1.5"
          >
            Service Area <span className="text-red-500">*</span>
          </label>
          <input
            id="serviceArea"
            name="serviceArea"
            type="text"
            value={formData.serviceArea}
            onChange={handleChange}
            placeholder="e.g. Koramangala, Indiranagar"
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-zinc-900 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all ${
              errors.serviceArea
                ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                : 'border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500'
            }`}
            aria-invalid={errors.serviceArea ? 'true' : 'false'}
            aria-describedby={errors.serviceArea ? 'serviceArea-error' : undefined}
          />
          {errors.serviceArea && (
            <p id="serviceArea-error" className="mt-1.5 text-xs text-red-600 font-medium">
              {errors.serviceArea}
            </p>
          )}
        </div>

        {/* Status */}
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-semibold text-zinc-800 mb-1.5"
          >
            Operational Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="active">Active (Eligible for deliveries)</option>
            <option value="inactive">Inactive (Off-duty / Paused)</option>
          </select>
          {errors.status && (
            <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.status}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-zinc-200">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleCancelClick}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 shadow-xs transition-colors"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>{isEdit ? 'Saving changes...' : 'Creating agent...'}</span>
            </>
          ) : (
            <span>{isEdit ? 'Save Changes' : 'Create Agent'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
