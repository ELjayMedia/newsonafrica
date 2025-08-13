export function handleError(error: unknown) {
  console.error('An error occurred:', error);

  if (error instanceof Error) {
    // You can add more specific error handling here
    if (error.message.includes('network')) {
      return { message: 'A network error occurred. Please check your connection and try again.' };
    }
  }

  return { message: 'An unexpected error occurred. Please try again later.' };
}
