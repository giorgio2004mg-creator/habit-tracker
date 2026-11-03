import { useState } from 'react'
import { DayView } from '../components/DayView'
import { ChevronLeft, ChevronRight } from '../components/icons'
import { Button, IconButton, PageHeader } from '../components/ui'
import { WeekSummary } from '../components/WeekSummary'
import { addDays, formatLong } from '../lib/dates'
import { capitalize } from '../lib/format'
import { isCompletedOn, isNa } from '../lib/progress'
import { isScheduledOn } from '../lib/schedule'
import { useStore } from '../state/store'

export function TodayPage() {
  const { data: app, habits, today } = useStore()
  const [date, setDate] = useState(today)
  const isToday = date === today

  const due = habits.filter((h) => isScheduledOn(h, date) && !isNa(app, h, date))
  const done = due.filter((h) => isCompletedOn(app, h, date)).length
  const label = formatLong(date)

  return (
    <>
      <PageHeader
        title={isToday ? 'Oggi' : capitalize(label)}
        subtitle={
          <>
            {isToday && `${capitalize(label)} · `}
            {due.length > 0 ? `${done} di ${due.length} completate` : 'Niente da fare'}
          </>
        }
        actions={
          <>
            {!isToday && (
              <Button variant="ghost" onClick={() => setDate(today)}>
                Oggi
              </Button>
            )}
            <IconButton label="Giorno precedente" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft />
            </IconButton>
            <IconButton label="Giorno successivo" onClick={() => setDate(addDays(date, 1))} disabled={isToday}>
              <ChevronRight />
            </IconButton>
          </>
        }
      />

      <div className="space-y-6">
        <DayView key={date} date={date} />
        <WeekSummary date={date} />
      </div>
    </>
  )
}
