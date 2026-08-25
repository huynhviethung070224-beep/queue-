import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog accessibility', () => {
  it('moves focus inside, traps Tab, supports Escape, and restores focus', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open dialog
          </button>
          <ConfirmDialog
            open={open}
            title="Remove player?"
            description="This removes the waiting entry."
            confirmLabel="Remove player"
            onCancel={() => {
              onCancel()
              setOpen(false)
            }}
            onConfirm={vi.fn()}
          />
        </>
      )
    }
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(opener)

    const dialog = screen.getByRole('alertdialog')
    const cancel = within(dialog).getByRole('button', { name: 'Keep current state' })
    const confirm = within(dialog).getByRole('button', { name: 'Remove player' })
    await waitFor(() => expect(cancel).toHaveFocus())

    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('does not dismiss while a destructive action is pending', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        pending
        title="End match?"
        description="Working"
        confirmLabel="End match"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    )

    await user.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
  })
})
