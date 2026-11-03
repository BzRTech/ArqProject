import { useParams } from 'react-router'
import EditorPage from '@/features/plan-editor/EditorPage'

/** Editor de um projeto do servidor (/projetos/:id). Trocar de projeto remonta o editor. */
export default function ProjectEditorPage() {
  const { id = '' } = useParams()
  return <EditorPage key={id} source={{ kind: 'server', id }} />
}
