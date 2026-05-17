import { redirect } from 'next/navigation'

// Temporarily disabled: booking handled via apnt.app/nailsbarkyiv (see homepage).
// Restore by reverting this file to its previous git revision.
export default function BookPage(): never {
  redirect('/')
}
