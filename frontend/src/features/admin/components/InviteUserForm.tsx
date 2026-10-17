'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { inviteUser } from '@/actions/admin.actions'
import { Card } from '@/components/shared/Card'
import {
  fieldErrorClass,
  inputClass,
  inputErrorClass,
  labelClass,
} from '@/components/shared/formClasses'
import { resetPassword } from '@/lib/firebase/auth'
import { cn } from '@/lib/utils'
import { inviteUserSchema, type InviteUserInput } from '@/lib/validations/auth'

/**
 * Add a person to the CRM. The server creates their account and profile; the
 * browser then sends Firebase's password-reset email, which is how they set
 * their first password (the Admin SDK can make the link but not send it).
 */
export function InviteUserForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { displayName: '', email: '', role: 'user' },
  })

  const onSubmit = async (data: InviteUserInput) => {
    const result = await inviteUser(data)
    if (!result.success || !result.data) {
      toast.error(result.error ?? 'Failed to add user')
      return
    }

    try {
      await resetPassword(result.data.email)
      toast.success(`${data.displayName} added — they've been emailed a link to set a password`)
    } catch {
      toast.warning(
        `${data.displayName} added, but the setup email failed. Use "Send setup email" to retry.`
      )
    }
    reset()
    router.refresh()
  }

  return (
    <Card title="Add a user">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 sm:grid-cols-[1fr_1fr_10rem_auto]"
      >
        <div>
          <label htmlFor="invite-name" className={labelClass}>
            Name
          </label>
          <input
            id="invite-name"
            autoComplete="off"
            aria-invalid={errors.displayName ? true : undefined}
            className={cn(inputClass, errors.displayName && inputErrorClass)}
            placeholder="Full name"
            {...register('displayName')}
          />
          {errors.displayName && <p className={fieldErrorClass}>{errors.displayName.message}</p>}
        </div>

        <div>
          <label htmlFor="invite-email" className={labelClass}>
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            autoComplete="off"
            aria-invalid={errors.email ? true : undefined}
            className={cn(inputClass, errors.email && inputErrorClass)}
            placeholder="name@example.com"
            {...register('email')}
          />
          {errors.email && <p className={fieldErrorClass}>{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="invite-role" className={labelClass}>
            Role
          </label>
          <select id="invite-role" className={inputClass} {...register('role')}>
            <option value="user">Team member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="sm:pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-600 hover:bg-brand-700 w-full rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Adding…' : 'Add user'}
          </button>
        </div>
      </form>
    </Card>
  )
}
