import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SaveResult } from '@/api/projects'
import { newProject } from '@/core/project/schema'
import { ServerSync, type SyncState } from './server-sync'

const conflict = { detail: 'x', revision: 7, updated_at: '', updated_by_name: 'Bia' }

function setup(results: (SaveResult | Error)[]) {
  const doc = newProject('e1')
  const calls: number[] = []
  const states: SyncState[] = []
  const saved: number[] = []
  const save = vi.fn(async (_d: unknown, rev: number) => {
    calls.push(rev)
    const r = results.shift()
    if (!r) return { kind: 'saved', revision: rev + 1 } as SaveResult
    if (r instanceof Error) throw r
    return r
  })
  const sync = new ServerSync(
    {
      save,
      getDoc: () => doc,
      onState: (s) => states.push(s),
      onSaved: (r) => saved.push(r),
      delayMs: 1000,
      retryMs: 5000,
    },
    3,
  )
  return { sync, save, calls, states, saved, last: () => states.at(-1)?.status }
}

describe('ServerSync (autosave com If-Match)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('agrupa mudanças seguidas num save, até 1 s depois da primeira', async () => {
    const t = setup([])
    t.sync.markDirty()
    await vi.advanceTimersByTimeAsync(600)
    t.sync.markDirty()
    expect(t.save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(400)
    expect(t.calls).toEqual([3])
    expect(t.sync.revision).toBe(4)
    expect(t.last()).toBe('salvo')
    expect(t.saved).toEqual([4])
  })

  it('mudança durante o save gera outro save com a revisão nova', async () => {
    let release!: () => void
    const t = setup([])
    t.save.mockImplementationOnce(
      (_d, rev) =>
        new Promise<SaveResult>((r) => {
          release = () => r({ kind: 'saved', revision: rev + 1 })
        }),
    )
    t.sync.markDirty()
    await vi.advanceTimersByTimeAsync(1000)
    t.sync.markDirty() // durante o envio
    release()
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.save.mock.calls.map((c) => c[1])).toEqual([3, 4])
    expect(t.sync.revision).toBe(5)
    expect(t.last()).toBe('salvo')
  })

  it('sem rede: fica offline e tenta de novo', async () => {
    const t = setup([new Error('rede')])
    t.sync.markDirty()
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.last()).toBe('offline')
    expect(t.sync.pending).toBe(true)
    await vi.advanceTimersByTimeAsync(5000)
    expect(t.calls).toEqual([3, 3])
    expect(t.last()).toBe('salvo')
  })

  it('409: para de salvar até o usuário decidir; "manter a minha" salva por cima', async () => {
    const t = setup([{ kind: 'conflict', conflict }])
    t.sync.markDirty()
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.states.at(-1)).toEqual({ status: 'conflito', conflict })
    t.sync.markDirty()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(t.calls).toEqual([3]) // nada de save automático durante o conflito
    await t.sync.overwrite(7)
    expect(t.calls).toEqual([3, 7])
    expect(t.sync.revision).toBe(8)
    expect(t.last()).toBe('salvo')
  })

  it('409: "usar a do servidor" descarta o pendente', async () => {
    const t = setup([{ kind: 'conflict', conflict }])
    t.sync.markDirty()
    await vi.advanceTimersByTimeAsync(1000)
    t.sync.reset(7)
    expect(t.sync.pending).toBe(false)
    expect(t.last()).toBe('salvo')
    t.sync.markDirty()
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.calls).toEqual([3, 7])
  })

  it('403: somente leitura, sem novas tentativas', async () => {
    const t = setup([{ kind: 'forbidden', message: 'leitura' }])
    t.sync.markDirty()
    await vi.advanceTimersByTimeAsync(1000)
    t.sync.markDirty()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(t.calls).toEqual([3])
    expect(t.last()).toBe('somente-leitura')
  })
})
