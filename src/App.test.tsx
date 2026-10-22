import { render, screen } from '@testing-library/react'
import App from '@/src/App'

test('renders the app shell', () => {
  render(<App />)
  expect(screen.getByText('Agrails')).toBeInTheDocument()
})
