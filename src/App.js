
import { FaTwitter } from "react-icons/fa";

function App() {
  return (
    <div className="w-full h-full min-w-screen min-h-screen flex justify-center">
      <div className="flex w-full justify-between mt-16">
        <div className="text-2xl text-bold ml-8 pl-8">
          Auto Brand Retweet
        </div>
        <div className="mr-8 pr-8">
          <button
              style={{backgroundColor: "#1DA1F2"}}
              className="text-white shadow-lg rounded-md py-2 px-4 w-full text-sm flex justify-around items-center">
            <span className="block m-w-full">Sign In with</span>&nbsp;<FaTwitter/>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
