export const getRelativeTimeString = (targetTime: Date, currentTime?: Date) => {
  const to = currentTime ?? new Date();
  const ms = targetTime.getTime() - to.getTime();
  const abs = Math.abs(ms);

  const minutes = Math.floor(abs / (1000 * 60));
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));

  let result: string;

  if (minutes < 60) result = `${minutes} minutes`;
  else if (hours < 24) result = `${hours} hours`;
  else result = `${days} days`;

  return ms >= 0 ? `${result} left` : `${result} ago`;
};

export const getSimpleDate = (date: Date, currentDate?: Date): string => {
  const now = currentDate ?? new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth()}/${date.getDay()}`;
  }
  return `${date.getMonth()}/${date.getDay()}/${date.getFullYear()}`;
};

export const getCommonDateString = (date: Date): string => {
  return `${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`;
};
