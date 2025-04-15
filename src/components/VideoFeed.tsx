const VideoFeed = () => {
    return (
      <div
        className="w-full h-[480px] bg-[#E0E0E0] rounded-lg flex justify-center items-center"
      >
        <iframe
          title="Video Feed"
          src="http://192.168.1.10:8000/video_feed"
          width="100%"
          height="100%"
          className="rounded-lg"
        ></iframe>
      </div>
    );
  };
  
  export default VideoFeed;