import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserRound, Phone } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const guestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Ingresá tu nombre completo')
      .max(80, 'El nombre es demasiado largo'),
    phone: z
      .string()
      .trim()
      .min(1, 'El teléfono es obligatorio')
      .regex(/^[+]?[0-9()\s.-]+$/, 'Formato de teléfono inválido'),
  })
  .superRefine((data, ctx) => {
    const digits = (data.phone || '').replace(/\D/g, '')
    if (digits.length < 8) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Ingresá un teléfono válido' })
    }
  })

/**
 * GuestForm — datos mínimos para confirmar una reserva como invitado.
 * Campos obligatorios: nombre y teléfono.
 *
 * @param {{ loading: boolean, onSubmit: (values: {name: string, phone: string}) => void }} props
 */
export default function GuestForm({ loading = false, onSubmit, defaultValues = {} }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(guestSchema),
    defaultValues: { name: '', phone: '', ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input
        label="Nombre completo"
        id="guest-name"
        placeholder="Ej. María Gómez"
        autoComplete="name"
        leftIcon={<UserRound className="h-4 w-4" />}
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Teléfono"
        id="guest-phone"
        type="tel"
        placeholder="Ej. 0981 123 456"
        autoComplete="tel"
        leftIcon={<Phone className="h-4 w-4" />}
        error={errors.phone?.message}
        {...register('phone')}
      />

      <Button
        type="submit"
        fullWidth
        loading={loading}
        className="mt-1"
      >
        Reservar como invitado
      </Button>
    </form>
  )
}