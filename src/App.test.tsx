import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import App from '@/src/App'

test('renders the first screen inside the app shell', async () => {
  render(<App />)
  expect(await screen.findByRole('main')).toBeInTheDocument()
})

test('survives StrictMode when scrollTo returns a promise (as in current Chrome)', async () => {
  const original = window.scrollTo
  window.scrollTo = (() =>
    Promise.resolve()) as unknown as typeof window.scrollTo
  try {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    expect(await screen.findByRole('main')).toBeInTheDocument()
  } finally {
    window.scrollTo = original
  }
})
