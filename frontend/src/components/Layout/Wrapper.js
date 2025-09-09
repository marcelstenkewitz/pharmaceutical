import React from 'react'

const Wrapper = ({children, centerText = true}) => {

  const styles = centerText ? "mx-auto text-center position-relative" : "mx-auto" 

  return (
    <div className={styles}>
      {children}
    </div>
  )
}

export default Wrapper
