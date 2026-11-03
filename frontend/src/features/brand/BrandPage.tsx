import { ImageUp, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { registerWebFonts } from '@/render/pdf/fonts'
import { useMe } from '@/api/auth'
import { uploadAsset } from '@/api/assets'
import { brandLines, useBrand, useUpdateBrand, type Brand } from '@/api/brand'
import { buildPlanSheet } from '@/core/sheets/plan-sheet'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'
import { SheetViewer } from '@/app/ui/SheetViewer'

type Form = Pick<Brand, 'name' | 'phone' | 'email' | 'website' | 'address' | 'registration'> & {
  brand_color: string
}

const FIELDS: { key: keyof Form; label: string; placeholder?: string }[] = [
  { key: 'name', label: 'Nome do escritório' },
  { key: 'phone', label: 'Telefone', placeholder: '(11) 99999-0000' },
  { key: 'email', label: 'E-mail de contato', placeholder: 'contato@seuestudio.com.br' },
  { key: 'website', label: 'Site', placeholder: 'seuestudio.com.br' },
  { key: 'address', label: 'Endereço', placeholder: 'Rua, número — cidade/UF' },
  { key: 'registration', label: 'Registro profissional', placeholder: 'CAU A12345-6' },
]

/**
 * "Minha marca": nome, logo, cor e contatos do escritório. Vão no carimbo de todas as
 * pranchas e no cabeçalho do memorial. Só o dono altera.
 */
export default function BrandPage() {
  const me = useMe().data
  const isOwner = me?.role === 'owner'
  const brand = useBrand()
  if (brand.isPending) return <p className="loading">Carregando…</p>
  if (!brand.data) return <p className="loading">{brand.error?.message}</p>
  return <BrandForm key={brand.data.id} brand={brand.data} isOwner={isOwner} />
}

function BrandForm({ brand, isOwner }: { brand: Brand; isOwner: boolean }) {
  const update = useUpdateBrand()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<Form>({
    name: brand.name,
    phone: brand.phone ?? '',
    email: brand.email ?? '',
    website: brand.website ?? '',
    address: brand.address ?? '',
    registration: brand.registration ?? '',
    brand_color: brand.brand_color || '#1c1b19',
  })
  const [logoAspect, setLogoAspect] = useState<number | null>(null)
  useEffect(() => {
    // Mesma fonte da prancha também na prévia.
    registerWebFonts().catch(() => undefined)
  }, [])

  // Prévia do carimbo: a MESMA montagem das pranchas, numa A4 sem desenho.
  const preview = useMemo(() => {
    const sheet = buildPlanSheet({
      build: () => [],
      title: 'Nome do ambiente',
      subtitle: 'NOME DO PROJETO',
      format: 'A4',
      dateText: new Date().toLocaleDateString('pt-BR'),
      brand: {
        name: form.name,
        lines: brandLines({ ...brand, ...form }),
        ...(brand.logo_url && logoAspect
          ? { logo: { href: brand.logo_url, aspect: logoAspect } }
          : {}),
      },
    })
    return {
      node: primitivesToSvg(sheet.primitives, {
        widthMm: sheet.widthMm,
        heightMm: sheet.heightMm,
        background: '#ffffff',
      }),
      w: sheet.widthMm,
      h: sheet.heightMm,
    }
  }, [form, brand, logoAspect])

  const set = (k: keyof Form) => (e: { target: { value: string } }) => {
    setSaved(false)
    setForm((f) => ({ ...f, [k]: e.target.value }))
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    update.mutate(form, { onSuccess: () => setSaved(true) })
  }
  const uploadLogo = (file: File) => {
    setUploading(true)
    setUploadError(undefined)
    uploadAsset(file, file.name)
      .then((id) => update.mutateAsync({ logo: id }))
      .catch((err: unknown) => setUploadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setUploading(false))
  }

  return (
    <section className="brand-page">
      <header className="projects__head">
        <div>
          <div className="eyebrow">Escritório</div>
          <h1>Minha marca</h1>
        </div>
      </header>
      <div className="brand-page__grid">
        <form className="form auth__form" onSubmit={submit} data-testid="brand-form">
          <div className="brand-logo">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt="Logo do escritório"
                onLoad={(e) =>
                  setLogoAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)
                }
                data-testid="brand-logo"
              />
            ) : (
              <span className="muted small">Sem logo</span>
            )}
            {isOwner && (
              <div className="button-row">
                <button
                  type="button"
                  className="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageUp size={15} strokeWidth={1.5} />
                  {uploading ? 'Enviando…' : brand.logo_url ? 'Trocar logo' : 'Enviar logo'}
                </button>
                {brand.logo_url && (
                  <button
                    type="button"
                    className="sm"
                    onClick={() => update.mutate({ logo: null })}
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                    Tirar
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              data-testid="brand-logo-input"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadLogo(f)
                e.target.value = ''
              }}
            />
          </div>
          {uploadError && <p className="form-error">{uploadError}</p>}
          {FIELDS.map((f) => (
            <label key={f.key} className="field">
              <span>{f.label}</span>
              <input
                value={form[f.key] ?? ''}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                disabled={!isOwner}
                required={f.key === 'name'}
                data-testid={`brand-${f.key}`}
              />
            </label>
          ))}
          <label className="field">
            <span>Cor da marca (memorial)</span>
            <span className="color-field">
              <input
                type="color"
                value={form.brand_color}
                onChange={set('brand_color')}
                disabled={!isOwner}
              />
              <input value={form.brand_color} onChange={set('brand_color')} disabled={!isOwner} />
            </span>
          </label>
          {update.error && <p className="form-error">{update.error.message}</p>}
          {isOwner ? (
            <button
              type="submit"
              className="primary"
              disabled={update.isPending}
              data-testid="brand-save"
            >
              {update.isPending ? 'Salvando…' : saved ? 'Salvo' : 'Salvar'}
            </button>
          ) : (
            <p className="muted small">Só o dono do escritório altera a marca.</p>
          )}
        </form>
        <div className="brand-preview">
          <div className="eyebrow">Prévia do carimbo (A4)</div>
          <div className="brand-preview__sheet" data-testid="brand-preview">
            <SheetViewer sheet={preview.node} widthMm={preview.w} heightMm={preview.h} />
          </div>
          <p className="muted small">
            O mesmo carimbo sai em todas as pranchas dos projetos do escritório, com o logo, o nome
            e os contatos. O memorial em PDF usa também a cor.
          </p>
        </div>
      </div>
    </section>
  )
}
