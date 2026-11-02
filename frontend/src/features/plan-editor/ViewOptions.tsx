import { Segmented } from '@/app/ui/Segmented'
import { Switch } from '@/app/ui/Switch'
import { useUnits } from './units-pref'

const WALL_UNITS = ['m', 'cm'] as const
const ITEM_UNITS = ['cm', 'mm'] as const

/** Opções da vista, flutuando no canto da área de desenho. */
export function ViewOptions() {
  const u = useUnits()
  return (
    <div
      className="view-options float"
      title="Unidades de digitação e exibição (o desenho é sempre exato, em mm)"
    >
      <Switch
        label="Humanizado"
        checked={u.humanized}
        onChange={u.setHumanized}
        title="Pisos com cor, na tela e no PDF"
        testId="humanized"
      />
      <Switch
        label="Cursor CAD"
        checked={u.cadCursor}
        onChange={u.setCadCursor}
        title="Cruz em tela cheia, como no LibreCAD/AutoCAD"
        testId="cad-cursor-toggle"
      />
      <span className="vsep" />
      <span className="view-options__unit">
        Paredes
        <Segmented
          label="Unidade das paredes"
          value={u.wall}
          options={WALL_UNITS}
          onChange={u.setWall}
          testId="unit-wall"
        />
      </span>
      <span className="view-options__unit">
        Móveis
        <Segmented
          label="Unidade dos móveis e esquadrias"
          value={u.item}
          options={ITEM_UNITS}
          onChange={u.setItem}
          testId="unit-item"
        />
      </span>
    </div>
  )
}
