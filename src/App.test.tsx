import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('application routes and major states', () => {
  it('lets a member move from the join form to personal waiting status', async () => {
    const user = userEvent.setup()
    renderRoute('/')

    await user.type(screen.getByLabelText('Display name'), 'Ian H.')
    await user.click(screen.getByRole('button', { name: 'Join queue' }))

    expect(screen.getByRole('heading', { name: 'Ian H.' })).toBeInTheDocument()
    expect(screen.getByText('Waiting')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave queue' })).toBeEnabled()
  })

  it('redirects a signed-out admin and opens the mock dashboard after sign in', async () => {
    const user = userEvent.setup()
    renderRoute('/admin')

    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open admin dashboard' }))

    expect(
      screen.getByRole('heading', { name: 'Club night control desk' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Recommended next group')).toBeInTheDocument()
  })

  it('shows a useful not-found page', () => {
    renderRoute('/missing-page')

    expect(
      screen.getByRole('heading', { name: 'This page is not on our court.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to member queue' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
