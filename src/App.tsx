import { MiniReact } from './mini-react';
import { useEffect, useState } from './mini-react/hooks';

interface PostData {
  isLoading: boolean;
  user: {
    userId: number;
    id: number;
    title: string;
    body: string;
  };
}

const initialPostData: PostData = {
  isLoading: false,
  user: {
    userId: 0,
    id: 0,
    title: '',
    body: '',
  },
};

export const App = () => {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<PostData>(initialPostData);

  useEffect(() => {
    const fetchPostData = async () => {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const resData = await response.json();

      setData(() => {
        return {
          isLoading: true,
          user: resData,
        };
      });
    };

    const timer = setTimeout(fetchPostData, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const countUpHandler = () => {
    setCount((prevCount) => prevCount + 1);
  };

  const countDownHandler = () => {
    setCount((prevCount) => prevCount - 1);
  };

  return (
    <div>
      <h1 style={{ color: 'green' }}>Count: {count}</h1>
      <button type="button" onClick={countUpHandler}>
        count up
      </button>
      <button type="button" onClick={countDownHandler}>
        count down
      </button>
      <hr />
      {data.isLoading ? (
        <div>
          <h1 style={{ color: 'blue' }}>user information</h1>
          <p>id: {data.user.id}</p>
          <p>title: {data.user.title}</p>
          <p>body: {data.user.body}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};
