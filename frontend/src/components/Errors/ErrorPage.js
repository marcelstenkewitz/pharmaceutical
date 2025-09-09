import React from 'react'
import { XCircleFill } from 'react-bootstrap-icons'
import Wrapper from '../Layout/Wrapper'

const errorPage = () => {
  return (
    <Wrapper centerText={true}>
      <h1>404! Something went wrong</h1>
      <XCircleFill color="red" size={300} />
    </Wrapper>
  )
}

export default errorPage
